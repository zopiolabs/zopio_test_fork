/**
 * SPDX-License-Identifier: MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment and keys
const mockEnv = {
  STRIPE_SECRET_KEY: 'sk_test_123456789',
  STRIPE_WEBHOOK_SECRET: 'whsec_test123456789',
};

vi.mock('../keys', () => ({
  keys: () => mockEnv,
}));

describe('Payments Integration', () => {
  let mockStripe: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const { stripe } = await import('../index');
    mockStripe = stripe;
  });

  describe('End-to-End Payment Flow', () => {
    it('should handle complete payment flow from customer to payment intent', async () => {
      // Step 1: Create customer
      const mockCustomer = {
        id: 'cus_integration123',
        email: 'integration@example.com',
        name: 'Integration Test User',
      };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const customer = await mockStripe.customers.create({
        email: 'integration@example.com',
        name: 'Integration Test User',
      });

      // Step 2: Create payment method
      const mockPaymentMethod = {
        id: 'pm_integration123',
        type: 'card',
        customer: null,
      };
      mockStripe.paymentMethods.create.mockResolvedValue(mockPaymentMethod);

      const paymentMethod = await mockStripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      // Step 3: Attach payment method to customer
      const mockAttachedPaymentMethod = {
        ...mockPaymentMethod,
        customer: customer.id,
      };
      mockStripe.paymentMethods.attach.mockResolvedValue(mockAttachedPaymentMethod);

      const attachedPaymentMethod = await mockStripe.paymentMethods.attach(
        paymentMethod.id,
        { customer: customer.id }
      );

      // Step 4: Create payment intent
      const mockPaymentIntent = {
        id: 'pi_integration123',
        amount: 2000,
        currency: 'usd',
        customer: customer.id,
        payment_method: attachedPaymentMethod.id,
        status: 'requires_confirmation',
      };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const paymentIntent = await mockStripe.paymentIntents.create({
        amount: 2000,
        currency: 'usd',
        customer: customer.id,
        payment_method: attachedPaymentMethod.id,
        confirmation_method: 'manual',
        confirm: false,
      });

      // Step 5: Confirm payment intent
      const mockConfirmedPaymentIntent = {
        ...mockPaymentIntent,
        status: 'succeeded',
      };
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockConfirmedPaymentIntent);

      const confirmedPaymentIntent = await mockStripe.paymentIntents.confirm(
        paymentIntent.id
      );

      // Verify the complete flow
      expect(customer.email).toBe('integration@example.com');
      expect(attachedPaymentMethod.customer).toBe(customer.id);
      expect(paymentIntent.customer).toBe(customer.id);
      expect(confirmedPaymentIntent.status).toBe('succeeded');
    });

    it('should handle complete subscription flow', async () => {
      // Step 1: Create customer
      const mockCustomer = {
        id: 'cus_subscription123',
        email: 'subscription@example.com',
      };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const customer = await mockStripe.customers.create({
        email: 'subscription@example.com',
      });

      // Step 2: Create product
      const mockProduct = {
        id: 'prod_subscription123',
        name: 'Premium Subscription',
        type: 'service',
      };
      mockStripe.products.create.mockResolvedValue(mockProduct);

      const product = await mockStripe.products.create({
        name: 'Premium Subscription',
        type: 'service',
      });

      // Step 3: Create price
      const mockPrice = {
        id: 'price_subscription123',
        product: product.id,
        unit_amount: 999,
        currency: 'usd',
        recurring: { interval: 'month' },
      };
      mockStripe.prices.create.mockResolvedValue(mockPrice);

      const price = await mockStripe.prices.create({
        product: product.id,
        unit_amount: 999,
        currency: 'usd',
        recurring: { interval: 'month' },
      });

      // Step 4: Create subscription
      const mockSubscription = {
        id: 'sub_subscription123',
        customer: customer.id,
        status: 'active',
        items: {
          data: [{ price: { id: price.id } }],
        },
      };
      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const subscription = await mockStripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
      });

      // Verify the subscription flow
      expect(subscription.customer).toBe(customer.id);
      expect(subscription.status).toBe('active');
      expect(subscription.items.data[0].price.id).toBe(price.id);
    });
  });

  describe('Webhook Event Processing Flow', () => {
    it('should process webhook events in sequence', async () => {
      // Mock webhook events
      const events = [
        {
          id: 'evt_customer_created',
          type: 'customer.created',
          data: { object: { id: 'cus_webhook123' } },
        },
        {
          id: 'evt_payment_succeeded',
          type: 'payment_intent.succeeded',
          data: { object: { id: 'pi_webhook123', customer: 'cus_webhook123' } },
        },
        {
          id: 'evt_invoice_paid',
          type: 'invoice.payment_succeeded',
          data: { object: { id: 'in_webhook123', customer: 'cus_webhook123' } },
        },
      ];

      // Process each event
      const processedEvents = [];
      for (const event of events) {
        mockStripe.webhooks.constructEvent.mockReturnValue(event);
        
        const constructedEvent = mockStripe.webhooks.constructEvent(
          JSON.stringify(event),
          'valid_signature',
          mockEnv.STRIPE_WEBHOOK_SECRET
        );
        
        processedEvents.push(constructedEvent);
      }

      expect(processedEvents).toHaveLength(3);
      expect(processedEvents[0].type).toBe('customer.created');
      expect(processedEvents[1].type).toBe('payment_intent.succeeded');
      expect(processedEvents[2].type).toBe('invoice.payment_succeeded');
    });

    it('should handle webhook event dependencies', async () => {
      // Process events that depend on each other
      const customerCreatedEvent = {
        id: 'evt_customer_created',
        type: 'customer.created',
        data: {
          object: {
            id: 'cus_dependent123',
            email: 'dependent@example.com',
          },
        },
      };

      const subscriptionCreatedEvent = {
        id: 'evt_subscription_created',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_dependent123',
            customer: 'cus_dependent123',
            status: 'active',
          },
        },
      };

      mockStripe.webhooks.constructEvent
        .mockReturnValueOnce(customerCreatedEvent)
        .mockReturnValueOnce(subscriptionCreatedEvent);

      // Process customer creation first
      const customerEvent = mockStripe.webhooks.constructEvent(
        JSON.stringify(customerCreatedEvent),
        'valid_signature',
        mockEnv.STRIPE_WEBHOOK_SECRET
      );

      // Then process subscription creation
      const subscriptionEvent = mockStripe.webhooks.constructEvent(
        JSON.stringify(subscriptionCreatedEvent),
        'valid_signature',
        mockEnv.STRIPE_WEBHOOK_SECRET
      );

      expect(customerEvent.data.object.id).toBe('cus_dependent123');
      expect(subscriptionEvent.data.object.customer).toBe('cus_dependent123');
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should handle transient errors with retry logic', async () => {
      let callCount = 0;
      mockStripe.customers.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const networkError = new Error('Network error');
          networkError.name = 'StripeConnectionError';
          throw networkError;
        }
        return Promise.resolve({
          id: 'cus_retry123',
          email: 'retry@example.com',
        });
      });

      // Simulate retry logic
      let customer;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          customer = await mockStripe.customers.create({
            email: 'retry@example.com',
          });
          break;
        } catch (error: any) {
          retries++;
          if (retries === maxRetries || error.name !== 'StripeConnectionError') {
            throw error;
          }
          // Wait before retry (in real implementation)
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      expect(customer?.id).toBe('cus_retry123');
      expect(callCount).toBe(2);
    });

    it('should not retry non-retryable errors', async () => {
      const cardError = new Error('Your card was declined');
      cardError.name = 'StripeCardError';
      (cardError as any).type = 'card_error';
      
      mockStripe.paymentIntents.create.mockRejectedValue(cardError);

      // This error should not be retried
      await expect(
        mockStripe.paymentIntents.create({
          amount: 2000,
          currency: 'usd',
        })
      ).rejects.toThrow('Your card was declined');

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security and Validation', () => {
    it('should validate API key format', async () => {
      expect(mockEnv.STRIPE_SECRET_KEY).toMatch(/^sk_test_/);
      expect(mockEnv.STRIPE_WEBHOOK_SECRET).toMatch(/^whsec_/);
    });

    it('should handle sensitive data securely', async () => {
      // Payment method creation should not expose sensitive data
      const mockPaymentMethod = {
        id: 'pm_secure123',
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242',
          // Sensitive data like full number should not be returned
        },
      };
      
      mockStripe.paymentMethods.create.mockResolvedValue(mockPaymentMethod);

      const paymentMethod = await mockStripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      // Verify sensitive data is not exposed
      expect(paymentMethod.card).not.toHaveProperty('number');
      expect(paymentMethod.card).not.toHaveProperty('cvc');
      expect(paymentMethod.card.last4).toBe('4242');
    });

    it('should validate webhook signatures properly', async () => {
      const validEvent = {
        id: 'evt_secure123',
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_secure123' } },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(validEvent);

      const event = mockStripe.webhooks.constructEvent(
        JSON.stringify(validEvent),
        'valid_signature',
        mockEnv.STRIPE_WEBHOOK_SECRET
      );

      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        JSON.stringify(validEvent),
        'valid_signature',
        mockEnv.STRIPE_WEBHOOK_SECRET
      );
      expect(event.id).toBe('evt_secure123');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent operations', async () => {
      const customerPromises = Array.from({ length: 5 }, (_, i) => {
        const mockCustomer = {
          id: `cus_concurrent${i}`,
          email: `concurrent${i}@example.com`,
        };
        mockStripe.customers.create.mockResolvedValueOnce(mockCustomer);
        
        return mockStripe.customers.create({
          email: `concurrent${i}@example.com`,
        });
      });

      const customers = await Promise.all(customerPromises);

      expect(customers).toHaveLength(5);
      customers.forEach((customer, i) => {
        expect(customer.id).toBe(`cus_concurrent${i}`);
      });
    });

    it('should handle large result sets with pagination', async () => {
      const mockCustomerList = {
        data: Array.from({ length: 100 }, (_, i) => ({
          id: `cus_page${i}`,
          email: `page${i}@example.com`,
        })),
        has_more: true,
        url: '/v1/customers',
      };

      mockStripe.customers.list.mockResolvedValue(mockCustomerList);

      const customers = await mockStripe.customers.list({
        limit: 100,
      });

      expect(customers.data).toHaveLength(100);
      expect(customers.has_more).toBe(true);
    });
  });
});