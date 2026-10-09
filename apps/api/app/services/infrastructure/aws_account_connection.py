"""Bounded read-only AWS calls. Customer credentials are never persisted."""
import re
from fastapi import HTTPException
from app.core.config import settings

ROLE = re.compile(r"^arn:aws:iam::(\d{12}):role/([A-Za-z0-9+=,.@_/-]{1,128})$")


def configured():
    return bool(settings.ENABLE_AWS_ACCOUNT_CONNECTION and ROLE.fullmatch(settings.AWS_PLATFORM_ROLE_ARN))


def platform_session(region):
    if not configured():
        raise HTTPException(503, "AWS account verification needs a configured LaunchComply execution identity.")
    import boto3
    from botocore.config import Config
    from botocore.exceptions import BotoCoreError, ClientError
    session = boto3.Session()
    if region not in session.get_available_regions("ec2", partition_name="aws"):
        raise HTTPException(422, "Choose a supported AWS commercial region.")
    config = Config(connect_timeout=4, read_timeout=6, retries={"total_max_attempts": 1})
    try:
        sts = session.client("sts", region_name=region, config=config)
        identity = sts.get_caller_identity()
    except (BotoCoreError, ClientError):
        raise HTTPException(503, "LaunchComply's AWS execution identity is unavailable. No customer access was verified.") from None
    expected = ROLE.fullmatch(settings.AWS_PLATFORM_ROLE_ARN)
    role_name = expected.group(2).rsplit("/", 1)[-1]
    prefix = f"arn:aws:sts::{expected.group(1)}:assumed-role/{role_name}/"
    if identity.get("Account") != expected.group(1) or not identity.get("Arn", "").startswith(prefix):
        raise HTTPException(503, "The runtime AWS identity does not match the configured LaunchComply worker role.")
    return session, sts, config


def setup_template(account_id, external_id, region):
    platform_session(region)  # Verify the actual principal before issuing trust.
    role_name = "LaunchComplyObserver"
    return {"AWSTemplateFormatVersion": "2010-09-09",
        "Description": "Read-only LaunchComply account observation; does not grant deployment permissions",
        "Resources": {"LaunchComplyObserver": {"Type": "AWS::IAM::Role", "Properties": {
            "RoleName": role_name,
            "AssumeRolePolicyDocument": {"Version": "2012-10-17", "Statement": [{"Effect": "Allow",
                "Principal": {"AWS": settings.AWS_PLATFORM_ROLE_ARN}, "Action": "sts:AssumeRole",
                "Condition": {"StringEquals": {"sts:ExternalId": external_id}}}]},
            "Policies": [{"PolicyName": "LaunchComplyObservedInventory", "PolicyDocument": {
                "Version": "2012-10-17", "Statement": [{"Effect": "Allow", "Action": [
                    "ec2:DescribeVpcs", "ecs:ListClusters", "rds:DescribeDBInstances", "elasticloadbalancing:DescribeLoadBalancers"],
                    "Resource": "*"}]}}]}}},
        "Outputs": {"ObserverRoleArn": {"Value": {"Fn::GetAtt": ["LaunchComplyObserver", "Arn"]}}}}


def verify(account_id, role_arn, external_id, region):
    from botocore.exceptions import BotoCoreError, ClientError
    match = ROLE.fullmatch(role_arn)
    if not match or match.group(1) != account_id:
        raise HTTPException(422, "The role ARN must belong to the AWS account selected during setup.")
    session, sts, config = platform_session(region)
    arguments = {"RoleArn": role_arn, "RoleSessionName": "LaunchComplyVerification", "DurationSeconds": 900}
    try:
        assumed = sts.assume_role(**arguments, ExternalId=external_id)
    except (BotoCoreError, ClientError):
        raise HTTPException(409, "AWS denied role access. Check the role ARN, trusted LaunchComply role and the setup ExternalId.") from None
    # Refuse both missing and mismatched IDs so wildcard trust cannot connect
    # an account under a different customer's generated connection reference.
    for probe in ({}, {"ExternalId": "invalid-" + external_id}):
        try:
            sts.assume_role(**arguments, **probe)
        except ClientError as error:
            if error.response.get("Error", {}).get("Code") not in {"AccessDenied", "AccessDeniedException"}:
                raise HTTPException(409, "AWS role isolation could not be verified. Review its trust policy.") from None
        except BotoCoreError:
            raise HTTPException(502, "AWS role isolation verification was interrupted. Please try again.") from None
        else:
            raise HTTPException(409, "This role permits access with a missing or incorrect ExternalId. Restrict its trust policy before connecting.")
    creds = assumed["Credentials"]
    import boto3
    customer = boto3.Session(aws_access_key_id=creds["AccessKeyId"], aws_secret_access_key=creds["SecretAccessKey"],
                             aws_session_token=creds["SessionToken"], region_name=region)
    try:
        identity = customer.client("sts", config=config).get_caller_identity()
    except (BotoCoreError, ClientError):
        raise HTTPException(502, "AWS could not confirm the assumed customer identity.") from None
    if identity.get("Account") != account_id:
        raise HTTPException(409, "AWS returned a different customer account. Connection was not saved.")
    resources, observations = [], []
    calls = (
        ("ec2", "describe_vpcs", {"MaxResults": 20}, "Vpcs", "VPC", "VpcId"),
        ("ecs", "list_clusters", {"maxResults": 20}, "clusterArns", "ECS_CLUSTER", None),
        ("rds", "describe_db_instances", {"MaxRecords": 20}, "DBInstances", "RDS_DATABASE", "DBInstanceIdentifier"),
        ("elbv2", "describe_load_balancers", {"PageSize": 20}, "LoadBalancers", "LOAD_BALANCER", "LoadBalancerArn"),
    )
    for service, method, args, key, kind, identifier in calls:
        try:
            result = getattr(customer.client(service, config=config), method)(**args)
            found = result.get(key, [])
            resources.extend({"type": kind, "id": item[identifier] if identifier else item, "region": region} for item in found)
            observations.append({"service": service, "status": "OBSERVED", "count": len(found),
                "truncated": bool(result.get("NextToken") or result.get("nextToken") or result.get("Marker") or result.get("NextMarker"))})
        except (BotoCoreError, ClientError):
            observations.append({"service": service, "status": "UNAVAILABLE", "count": None, "truncated": False})
    return {"account_id": identity["Account"], "assumed_role_arn": identity["Arn"], "resources": resources,
            "observations": observations, "scope": "Role access and bounded regional inventory only. Deployment permissions and monitoring are not verified."}
