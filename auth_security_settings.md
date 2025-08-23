# Auth Security Settings Configuration

## Manual Configuration Required in Supabase Dashboard

The following security settings need to be configured manually in your Supabase Dashboard:

### 1. Enable Leaked Password Protection

**Path**: Project Dashboard → Authentication → Settings → Password Settings

**Instructions**:
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Settings
3. Scroll to "Password Settings" section
4. Toggle ON "Check against HaveIBeenPwned"
5. Click "Save"

**What this does**: Prevents users from using passwords that have been compromised in data breaches.

### 2. Enable Additional MFA Options

**Path**: Project Dashboard → Authentication → Settings → Multi-Factor Authentication

**Instructions**:
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Settings
3. Scroll to "Multi-Factor Authentication" section
4. Enable the following MFA methods:
   - ✅ **TOTP (Time-based One-Time Password)** - Already enabled
   - ✅ **Phone (SMS)** - Enable if needed for Nigerian users
   - ✅ **WebAuthn (Passkeys)** - Enable for modern security

**Recommended Settings**:
- **TOTP**: Enable (supports Google Authenticator, Authy, etc.)
- **Phone (SMS)**: Enable with appropriate SMS provider for Nigeria
- **WebAuthn**: Enable for biometric authentication

### 3. Additional Security Recommendations

**Session Settings**:
- Set appropriate session timeout (e.g., 7 days for web, 30 days for mobile)
- Enable "Force Single Session" if needed for admin users

**Email Settings**:
- Ensure email verification is required
- Set appropriate email templates for Nigerian market

### 4. Implementation Status

- ✅ Password complexity rules - Already implemented
- ✅ Account lockout policies - Default Supabase protection
- ⏳ Leaked password protection - **MANUAL CONFIGURATION REQUIRED**
- ⏳ Additional MFA methods - **MANUAL CONFIGURATION REQUIRED**

### 5. Testing Instructions

After configuration:
1. Test password creation with a known compromised password
2. Test MFA enrollment flow
3. Verify MFA login process
4. Test account recovery flows

### 6. Monitoring

Set up monitoring for:
- Failed authentication attempts
- MFA enrollment rates
- Password reset frequency
- Suspicious login patterns

---

## Implementation Notes

These settings cannot be automated through SQL migrations as they are managed through Supabase's Auth service configuration. They must be set through the Supabase Dashboard UI.

**Project ID**: ehuuqltrlfcmrsiwgrml
**Dashboard URL**: https://supabase.com/dashboard/project/ehuuqltrlfcmrsiwgrml/auth/users
