# GitHub Scout Customer Onboarding Email Templates

Use these as the first manual/GHL email sequences after Stripe checkout.

## Email 1: Immediate Welcome

Subject: Welcome to GitHub Scout - send your storefront URLs

Hi {{ first_name | default: "there" }},

Thanks for joining GitHub Scout.

Next step: submit the storefront URLs you want analyzed here:

{{ customer_onboarding_url }}

Operator includes up to 10 storefront analyses per month. Director includes up to 30. Both use every live detection source (10 today, 15 planned).

For the strongest first report, include:

- The storefront URLs you want reviewed
- Current plugins, embeds, widgets, and third-party tools you know are installed
- Anything that feels expensive, slow, duplicated, or weak for conversion
- The decision you want the report to help you make

Please do not send passwords, Shopify admin access, private API keys, customer exports, or internal URLs. Public storefront URLs and context are enough.

Support: support@githubscout.ai

## Email 2: Missing Onboarding Nudge

Subject: Quick nudge - your Scout report needs URLs

Hi {{ first_name | default: "there" }},

Your GitHub Scout subscription is active, but we still need your storefront URLs before we can prepare the first analysis.

Submit them here:

{{ customer_onboarding_url }}

The first report focuses on:

- What you currently have installed
- What looks duplicated, expensive, or conversion-limiting
- What to keep, replace, remove, or test
- Where savings and conversion upside are most likely

## Email 3: First Report Delivery

Subject: Your GitHub Scout storefront action plan is ready

Hi {{ first_name | default: "there" }},

Your storefront action plan is ready.

Start with the top three recommendations. Those are ranked for speed of action, likely savings, and conversion leverage.

When reviewing the report, look for:

- The current tool or stack signal
- The recommended alternative or action
- The estimated savings/conversion angle
- The reason to act before the next billing cycle
- The next test or implementation step

Reply with the recommendation you want to act on first and we can help prioritize the next scan.

## Email 4: Refund/Cancellation Safety

Subject: Need help getting value from GitHub Scout?

Hi {{ first_name | default: "there" }},

If Scout is not helping you make a clearer software decision, reply here and tell us what missed.

Operator and Director include a 14-day first-month money-back guarantee. We would rather fix the analysis or refund cleanly than leave you stuck.

Support: support@githubscout.ai
