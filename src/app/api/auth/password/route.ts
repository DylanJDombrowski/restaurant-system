import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const redirect = searchParams.get("redirect") || "/";

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Pizza Mia - Private Access</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 400px; margin: 100px auto; padding: 20px; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        button { width: 100%; padding: 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #b91c1c; }
      </style>
    </head>
    <body>
      <h2>🍕 Pizza Mia Development</h2>
      <p>This is a private development environment.</p>
      <form action="/api/auth/password" method="POST">
        <input type="password" name="password" placeholder="Enter password" required />
        <input type="hidden" name="redirect" value="${redirect}" />
        <button type="submit">Access System</button>
      </form>
    </body>
    </html>
  `,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password");
  const redirect = formData.get("redirect") || "/";

  if (password === process.env.VERCEL_PASSWORD) {
    const response = NextResponse.redirect(
      new URL(redirect as string, request.url)
    );
    response.cookies.set("vercel-auth", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 86400, // 24 hours
    });
    return response;
  }

  return new NextResponse("Invalid password", { status: 401 });
}
