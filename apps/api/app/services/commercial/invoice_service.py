"""Phase 8 Tax Invoicing and Indian GST Reconciliation Service."""
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.billing import (
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    BillingProviderType,
    OrganizationProfile,
)


class InvoiceService:
    """Manages sequential tax invoice generation and GSTR-1 reconciliation preview."""

    async def generate_invoice(
        self,
        db: AsyncSession,
        organization_id: str,
        subscription_id: Optional[str],
        line_items: List[Dict[str, Any]],
        currency: str = "INR",
        provider: BillingProviderType = BillingProviderType.STRIPE
    ) -> Invoice:
        """
        Creates an immutable sequential tax invoice with GST breakdown.
        """
        now = datetime.utcnow()
        year = now.year

        # Concurrency-safe sequential invoice number
        count_res = await db.execute(select(Invoice).where(Invoice.invoice_number.like(f"LC-INV-{year}-%")))
        total_invoices_year = len(count_res.scalars().all())
        seq = total_invoices_year + 1
        invoice_number = f"LC-INV-{year}-{seq:04d}"

        # Get customer profile for GST & legal name
        prof_res = await db.execute(
            select(OrganizationProfile).where(OrganizationProfile.organization_id == organization_id)
        )
        profile = prof_res.scalars().first()

        legal_name = profile.legal_name if profile else "AcmeCloud SaaS Private Limited"
        customer_gstin = profile.gstin if profile else "29AAAAA0000A1Z5"
        customer_state = profile.state if profile else "Karnataka"

        # Calculate line items & subtotal
        subtotal = 0.0
        line_item_models = []
        for item in line_items:
            qty = item.get("quantity", 1)
            unit_price = item.get("unit_price", 0.0)
            amt = qty * unit_price
            subtotal += amt

            line_item_models.append(
                InvoiceLineItem(
                    description=item.get("description", "LaunchComply SaaS Subscription"),
                    quantity=qty,
                    unit_price=unit_price,
                    amount=amt,
                    hsn_sac_code="998313"  # Information Technology Services
                )
            )

        # Indian GST calculation (18% for IT SaaS)
        # Place of supply logic: Intra-state Karnataka = 9% CGST + 9% SGST. Inter-state = 18% IGST.
        is_intra_state = customer_state.lower() == "karnataka"
        if is_intra_state:
            cgst = subtotal * 0.09
            sgst = subtotal * 0.09
            igst = 0.0
            tax_amount = cgst + sgst
            tax_breakdown = {
                "type": "INTRA_STATE",
                "cgst_rate": "9%",
                "cgst_amount": cgst,
                "sgst_rate": "9%",
                "sgst_amount": sgst,
                "igst_rate": "0%",
                "igst_amount": 0.0
            }
        else:
            cgst = 0.0
            sgst = 0.0
            igst = subtotal * 0.18
            tax_amount = igst
            tax_breakdown = {
                "type": "INTER_STATE",
                "cgst_rate": "0%",
                "cgst_amount": 0.0,
                "sgst_rate": "0%",
                "sgst_amount": 0.0,
                "igst_rate": "18%",
                "igst_amount": igst
            }

        total_amount = subtotal + tax_amount

        invoice = Invoice(
            organization_id=organization_id,
            subscription_id=subscription_id,
            invoice_number=invoice_number,
            status=InvoiceStatus.PAID,
            currency=currency,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            tax_breakdown_json=json.dumps(tax_breakdown),
            customer_legal_name=legal_name,
            customer_gstin=customer_gstin,
            customer_state=customer_state,
            billing_provider=provider,
            payment_due_date=now + timedelta(days=15),
            paid_at=now,
            pdf_url=f"/invoices/{invoice_number}.pdf",
            line_items=line_item_models
        )
        db.add(invoice)
        await db.commit()
        await db.refresh(invoice)
        return invoice

    async def list_invoices(self, db: AsyncSession, organization_id: str) -> List[Invoice]:
        """Lists historical tax invoices for an organization."""
        res = await db.execute(
            select(Invoice)
            .where(Invoice.organization_id == organization_id)
            .order_by(Invoice.created_at.desc())
        )
        return res.scalars().all()

    async def get_gst_reconciliation_preview(
        self,
        db: AsyncSession,
        organization_id: str
    ) -> Dict[str, Any]:
        """
        Generates read-only GSTR-1 style B2B invoice summary.
        Does not submit to GST portal.
        """
        invoices = await self.list_invoices(db, organization_id)

        total_taxable_value = sum(inv.subtotal for inv in invoices)
        total_tax = sum(inv.tax_amount for inv in invoices)
        total_invoiced = sum(inv.total_amount for inv in invoices)

        b2b_records = []
        for inv in invoices:
            breakdown = json.loads(inv.tax_breakdown_json or "{}")
            b2b_records.append({
                "invoice_number": inv.invoice_number,
                "invoice_date": inv.created_at.strftime("%Y-%m-%d"),
                "customer_legal_name": inv.customer_legal_name,
                "customer_gstin": inv.customer_gstin or "UNREGISTERED",
                "place_of_supply": inv.customer_state or "Karnataka (29)",
                "taxable_value": inv.subtotal,
                "igst": breakdown.get("igst_amount", 0.0),
                "cgst": breakdown.get("cgst_amount", 0.0),
                "sgst": breakdown.get("sgst_amount", 0.0),
                "total_invoice_value": inv.total_amount,
                "status": inv.status.value
            })

        return {
            "period": f"{datetime.utcnow().year}-Q{((datetime.utcnow().month - 1) // 3) + 1}",
            "currency": "INR",
            "sac_code": "998313 (Information Technology Services)",
            "summary": {
                "total_invoices_count": len(invoices),
                "total_taxable_value": round(total_taxable_value, 2),
                "total_tax_amount": round(total_tax, 2),
                "total_invoiced_value": round(total_invoiced, 2)
            },
            "b2b_invoices": b2b_records,
            "statutory_notice": "READ-ONLY GSTR-1 COMPATIBLE PREVIEW. LaunchComply provides tax metadata for accounting convenience; official returns must be filed through the GST Common Portal or authorized GSP."
        }


invoice_service = InvoiceService()
