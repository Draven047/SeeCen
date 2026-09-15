import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getHubMetrics, type HubOrder } from '../src/lib/hubMetrics';

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
});
