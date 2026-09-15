import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getHubMetrics, getHubOperations, getHubBreakdown, type HubOrder } from '../src/lib/hubMetrics';

const now = new Date(2026, 8, 15, 14, 30);
function order(overrides: Partial<HubOrder> = {}): HubOrder {
  return { id: 'order', order_number: 'SC-1', total: 100, status: 'created', fulfillment_status: 'new', is_voided: false, created_at: new Date(2026, 8, 15, 9).toISOString(), sla_deadline: null, customer: null, ...overrides };
}

describe('Hub metrics', () => {
  it('uses local midnight and excludes future timestamps from today', () => {
    const result = getHubMetrics([
      order({ created_at: new Date(2026, 8, 15, 0, 1).toISOString() }),
      order({ created_at: new Date(2026, 8, 14, 23, 59).toISOString() }),
      order({ created_at: new Date(2026, 8, 15, 23).toISOString() }),
    ], 'today', now);
    assert.equal(result.count, 1);
    assert.equal(result.total, 100);
    assert.equal(result.trend.reduce((sum, bucket) => sum + bucket.value, 0), 100);
  });

  it('keeps older open orders in the queue regardless of sales period', () => {
    const result = getHubMetrics([
      order({ created_at: new Date(2026, 5, 1).toISOString(), fulfillment_status: 'pending', sla_deadline: new Date(2026, 5, 2).toISOString() }),
      order({ fulfillment_status: 'delivered', sla_deadline: new Date(2026, 5, 2).toISOString() }),
      order({ fulfillment_status: 'returned' }),
    ], 'today', now);
    assert.equal(result.openOrders.length, 1);
    assert.equal(result.overdue.length, 1);
  });

  it('excludes cancelled, declined and voided orders from totals and work', () => {
    const result = getHubMetrics([
      order({ is_voided: true }), order({ status: 'cancelled' }),
      order({ fulfillment_status: 'declined' }), order({ total: '250' }),
    ], 'today', now);
    assert.equal(result.total, 250);
    assert.equal(result.count, 1);
    assert.equal(result.average, 250);
    assert.equal(result.openOrders.length, 1);
  });

  it('includes exactly seven calendar days with zero-value gaps', () => {
    const result = getHubMetrics([
      order({ created_at: new Date(2026, 8, 9).toISOString() }),
      order({ created_at: new Date(2026, 8, 8, 23, 59).toISOString() }),
    ], '7d', now);
    assert.equal(result.count, 1);
    assert.equal(result.trend.length, 7);
    assert.equal(result.trend.filter(bucket => bucket.orders === 0).length, 6);
  });

  it('keeps all-time chart totals consistent across years', () => {
    const result = getHubMetrics([
      order({ created_at: new Date(2024, 1, 29).toISOString(), total: 200 }),
      order({ created_at: new Date(2026, 5, 12).toISOString(), total: 300 }),
      order({ total: null }), order({ total: 'invalid' }),
    ], 'all', now);
    assert.equal(result.total, 500);
    assert.equal(result.trend.length, 3);
    assert.equal(result.trend.reduce((sum, bucket) => sum + bucket.value, 0), result.total);
    assert.equal(result.trend.reduce((sum, bucket) => sum + bucket.orders, 0), result.count);
  });

  it('returns honest zeroes for an empty period', () => {
    const result = getHubMetrics([], '30d', now);
    assert.equal(result.total, 0);
    assert.equal(result.average, 0);
    assert.equal(result.trend.length, 30);
    assert.ok(result.trend.every(bucket => bucket.value === 0 && bucket.orders === 0));
  });

  it('counts distinct known customers, not anonymous orders or matching names', () => {
    const result = getHubMetrics([
      order({ customer_id: 'a' }), order({ customer_id: 'a' }),
      order({ customer_id: 'b' }), order(),
      order({ customer_id: 'c', is_voided: true }),
    ], 'today', now);
    assert.equal(result.customers, 2);
    assert.equal(result.trend.find(bucket => bucket.orders === 4)?.customers, 2);
  });

  it('preserves operational signals independently of sales reporting dates', () => {
    const result = getHubOperations([
      order({ fulfillment_status: 'failed_delivery', created_at: new Date(2026, 5, 1).toISOString() }),
      order({ fulfillment_status: 'packed' }), order({ fulfillment_status: 'ready' }),
      order({ fulfillment_status: 'packed', is_voided: true }),
      order({ fulfillment_status: 'in_transit' }),
      order({ fulfillment_status: 'delivered', shipped_at: new Date(2026, 8, 15, 10).toISOString(), sla_deadline: new Date(2026, 8, 15, 11).toISOString() }),
      order({ fulfillment_status: 'accepted', sla_deadline: new Date(2026, 8, 15, 11).toISOString() }),
    ], now);
    assert.equal(result.failed, 1);
    assert.equal(result.packed, 2);
    assert.equal(result.dispatchScore, 50);
    assert.equal(result.inTransit, 1);
    assert.equal(result.delivered, 1);
    assert.equal(getHubOperations([], now).dispatchScore, null);
  });

  it('keeps channel mix and product totals consistent with valid period orders', () => {
    const items = [{ product_id: 'shoe', quantity: 2, total_price: 100 }];
    const result = getHubBreakdown([
      order({ channel: 'ondc', order_items: items }),
      order({ channel: 'website', order_items: items }),
      order({ channel: 'website', order_items: items, is_voided: true }),
    ]);
    assert.deepEqual(result.products, [{ id: 'shoe', value: 200, units: 4 }]);
    assert.equal(result.channels.length, 2);
    assert.ok(result.channels.every(channel => channel.share === 50));
  });
});
