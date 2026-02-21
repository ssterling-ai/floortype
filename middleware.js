import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect /admin
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const auth = request.cookies.get('ft_admin_auth');
  if (auth?.value === process.env.ADMIN_PASSWORD) {
    return NextResponse.next();
  }

  // Check for password in URL (login form submission)
  const url = request.nextUrl.clone();
  const submitted = url.searchParams.get('pwd');
  if (submitted && submitted === process.env.ADMIN_PASSWORD) {
    const res = NextResponse.redirect(new URL('/admin', request.url));
    res.cookies.set('ft_admin_auth', submitted, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/'
    });
    return res;
  }

  // Show login page
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Floortype Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    min-height: 100vh;
    background: linear-gradient(135deg, #1A0F4F 0%, #120F2A 60%, #0D2B28 100%);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  }
  .box {
    background: white; border-radius: 20px;
    padding: 48px 40px; width: 100%; max-width: 380px;
    box-shadow: 0 24px 80px rgba(0,0,0,0.4);
    text-align: center;
  }
  .logo {
    display: inline-flex; align-items: center; gap: 8px;
    margin-bottom: 28px;
  }
  .logo-mark {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, #6B56C8, #2AB5A0);
    display: flex; align-items: center; justify-content: center;
  }
  .logo-text { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.08em; color: #120F2A; }
  .title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.06em; color: #120F2A; margin-bottom: 6px; }
  .sub { font-size: 13px; color: #888; margin-bottom: 32px; }
  .field { margin-bottom: 16px; text-align: left; }
  .label { display: block; font-size: 12px; font-weight: 600; color: #444; margin-bottom: 6px; letter-spacing: 0.04em; }
  .input {
    width: 100%; padding: 12px 14px; border: 1.5px solid #E8E4F5;
    border-radius: 10px; font-size: 14px; font-family: 'DM Sans', sans-serif;
    color: #120F2A; outline: none; transition: border-color 0.2s;
  }
  .input:focus { border-color: #6B56C8; }
  .btn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #4B2EC5, #2AB5A0);
    color: white; border: none; border-radius: 12px;
    font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif;
    cursor: pointer; margin-top: 8px; transition: opacity 0.2s;
  }
  .btn:hover { opacity: 0.9; }
  .error { font-size: 12px; color: #E85555; margin-top: 12px; display: none; }
  .error.show { display: block; }
</style>
</head>
<body>
<div class="box">
  <div class="logo">
    <div class="logo-mark">
      <svg viewBox="0 0 20 20" fill="none" width="14" height="14">
        <rect x="2" y="2" width="16" height="16" rx="2" stroke="white" stroke-width="1.5"/>
        <line x1="2" y1="10" x2="18" y2="10" stroke="white" stroke-width="1.5"/>
        <line x1="10" y1="2" x2="10" y2="10" stroke="white" stroke-width="1.5"/>
      </svg>
    </div>
    <span class="logo-text">Floortype</span>
  </div>
  <h1 class="title">Admin Access</h1>
  <p class="sub">Enter your password to continue</p>
  <form method="GET" action="/admin">
    <div class="field">
      <label class="label">Password</label>
      <input class="input" type="password" name="pwd" placeholder="••••••••" autofocus required>
    </div>
    <button class="btn" type="submit">Sign In →</button>
    ${submitted !== null ? '<p class="error show">Incorrect password. Try again.</p>' : ''}
  </form>
</div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html' }
  });
}

export const config = {
  matcher: '/admin'
};
