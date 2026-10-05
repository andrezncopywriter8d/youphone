import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.headers.has("x-middleware-subrequest")) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
