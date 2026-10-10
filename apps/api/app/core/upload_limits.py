"""Bound request bodies before multipart or JSON parsing."""
from starlette.responses import JSONResponse


class CodeUploadLimitMiddleware:
    def __init__(self, app, path, maximum=4 * 1024 * 1024, size_error="Choose a ZIP file no larger than 3 MB."):
        self.app = app
        self.path = path
        self.maximum = maximum
        self.size_error = size_error

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path", "").rstrip("/") != self.path or scope.get("method") != "POST":
            return await self.app(scope, receive, send)
        maximum = self.maximum
        headers = dict(scope.get("headers", []))
        try:
            if int(headers.get(b"content-length", b"0")) > maximum:
                return await JSONResponse({"detail": self.size_error}, status_code=413)(scope, receive, send)
        except ValueError:
            return await JSONResponse({"detail": "Invalid request length."}, status_code=400)(scope, receive, send)
        # Validate the complete bounded body before the parser creates temporary files.
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body.extend(message.get("body", b""))
            if len(body) > maximum:
                return await JSONResponse({"detail": self.size_error}, status_code=413)(scope, receive, send)
            if not message.get("more_body", False):
                break
        replayed = False

        async def bounded_receive():
            nonlocal replayed
            if not replayed:
                replayed = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, bounded_receive, send)
