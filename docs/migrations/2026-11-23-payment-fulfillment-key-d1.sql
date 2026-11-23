-- D1 / SQLite, run once BEFORE deploying the payment fulfillment code.
-- Existing historical duplicate grants keep NULL keys and are not altered.
-- DO NOT run db:push on production; apply reviewed D1 migration manually.
ALTER TABLE credit ADD COLUMN fulfillment_key TEXT;
CREATE UNIQUE INDEX ux_credit_fulfillment_key ON credit(fulfillment_key);
ALTER TABLE subscription ADD COLUMN fulfillment_key TEXT;
CREATE UNIQUE INDEX ux_subscription_fulfillment_key ON subscription(fulfillment_key);
