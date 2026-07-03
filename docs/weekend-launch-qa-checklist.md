# GitHub Scout Weekend Launch QA Checklist

Run this before paid traffic.

## Payments

- Rotate/revoke the previously exposed unrestricted Stripe live secret key.
- Confirm Operator Payment Link charges $17/month.
- Confirm Director Payment Link charges $37/month.
- Confirm receipts are enabled.
- Confirm failed-payment recovery is enabled.
- Confirm refund flow works.
- Confirm cancellation/customer portal flow works.

## Lead and Customer Flow

- Submit the Operator URL analyzer with a test email.
- Confirm the analyzer result page renders recommendations.
- Submit customer onboarding with a test email.
- Confirm Netlify Forms captures the onboarding submission.
- Confirm GHL/Zapier receives webhook payload once configured.
- Confirm support inbox receives mail.

## Live Pages

```bash
node scripts/verify-githubscout-launch.js https://githubscout-ecommerce-v9-20260609.netlify.app
node scripts/verify-githubscout-launch.js https://githubscout-ecommerce-v10-20260624.netlify.app
```

Check:

- Homepage
- Operator savings page
- URL analyzer
- Checkout pages
- Thank-you pages
- Customer onboarding
- Privacy
- Terms
- Data Handling
- Refunds
- Support

## Attribution

- Add Meta Pixel ID to `assets/launch-config.js`.
- Confirm checkout click events fire.
- Confirm URL analyzer form events fire.
- Confirm customer onboarding submit event fires.
- Use UTM-tagged ad links.

## First 24-Hour Metrics

- Landing page visits
- URL analyzer starts
- URL analyzer completions
- Checkout clicks
- Stripe purchases
- Onboarding submissions
- Refund requests
- Support requests
