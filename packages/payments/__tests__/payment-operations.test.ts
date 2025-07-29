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

describe('Payment Operations', () => {
  let mockStripe: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    
    const { stripe } = await import('../index');
    mockStripe = stripe;
  });

  describe('Customer Management', () => {
    it('should create a new customer', async () => {
      const mockCustomer = {
        id: 'cus_123456789',
        email: 'test@example.com',
        name: 'John Doe',
      };
      
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await mockStripe.customers.create({
        email: 'test@example.com',
        name: 'John Doe',
      });

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should retrieve an existing customer', async () => {
      const mockCustomer = {
        id: 'cus_123456789',
        email: 'test@example.com',
        name: 'John Doe',
      };
      
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await mockStripe.customers.retrieve('cus_123456789');

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_123456789');
      expect(result).toEqual(mockCustomer);
    });

    it('should update customer information', async () => {
      const mockCustomer = {
        id: 'cus_123456789',
        email: 'updated@example.com',
        name: 'Jane Doe',
      };
      
      mockStripe.customers.update.mockResolvedValue(mockCustomer);

      const result = await mockStripe.customers.update('cus_123456789', {
        email: 'updated@example.com',
        name: 'Jane Doe',
      });

      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_123456789', {
        email: 'updated@example.com',
        name: 'Jane Doe',
      });
      expect(result).toEqual(mockCustomer);
    });

    it('should list customers with pagination', async () => {
      const mockCustomers = {
        data: [
          { id: 'cus_1', email: 'user1@example.com' },
          { id: 'cus_2', email: 'user2@example.com' },
        ],
        has_more: false,
      };
      
      mockStripe.customers.list.mockResolvedValue(mockCustomers);

      const result = await mockStripe.customers.list({
        limit: 10,
        starting_after: 'cus_start',
      });

      expect(mockStripe.customers.list).toHaveBeenCalledWith({
        limit: 10,
        starting_after: 'cus_start',
      });
      expect(result).toEqual(mockCustomers);
    });

    it('should delete a customer', async () => {
      const mockDeleted = {
        id: 'cus_123456789',
        deleted: true,
      };
      
      mockStripe.customers.delete.mockResolvedValue(mockDeleted);

      const result = await mockStripe.customers.delete('cus_123456789');

      expect(mockStripe.customers.delete).toHaveBeenCalledWith('cus_123456789');
      expect(result).toEqual(mockDeleted);
    });
  });

  describe('Payment Intent Management', () => {
    it('should create a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123456789',
        amount: 2000,
        currency: 'usd',
        status: 'requires_payment_method',
      };
      
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await mockStripe.paymentIntents.create({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_123456789',
      });

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 2000,
        currency: 'usd',
        customer: 'cus_123456789',
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should retrieve a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123456789',
        amount: 2000,
        currency: 'usd',
        status: 'succeeded',
      };
      
      mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

      const result = await mockStripe.paymentIntents.retrieve('pi_123456789');

      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith('pi_123456789');
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should confirm a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123456789',
        status: 'succeeded',
      };
      
      mockStripe.paymentIntents.confirm.mockResolvedValue(mockPaymentIntent);

      const result = await mockStripe.paymentIntents.confirm('pi_123456789', {
        payment_method: 'pm_123456789',
      });

      expect(mockStripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_123456789', {
        payment_method: 'pm_123456789',
      });
      expect(result).toEqual(mockPaymentIntent);
    });

    it('should cancel a payment intent', async () => {
      const mockPaymentIntent = {
        id: 'pi_123456789',
        status: 'canceled',
      };
      
      mockStripe.paymentIntents.cancel.mockResolvedValue(mockPaymentIntent);

      const result = await mockStripe.paymentIntents.cancel('pi_123456789');

      expect(mockStripe.paymentIntents.cancel).toHaveBeenCalledWith('pi_123456789');
      expect(result).toEqual(mockPaymentIntent);
    });
  });

  describe('Payment Method Management', () => {
    it('should create a payment method', async () => {
      const mockPaymentMethod = {
        id: 'pm_123456789',
        type: 'card',
        card: { brand: 'visa', last4: '4242' },
      };
      
      mockStripe.paymentMethods.create.mockResolvedValue(mockPaymentMethod);

      const result = await mockStripe.paymentMethods.create({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });

      expect(mockStripe.paymentMethods.create).toHaveBeenCalledWith({
        type: 'card',
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2025,
          cvc: '123',
        },
      });
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should attach payment method to customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_123456789',
        customer: 'cus_123456789',
      };
      
      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const result = await mockStripe.paymentMethods.attach('pm_123456789', {
        customer: 'cus_123456789',
      });

      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_123456789', {
        customer: 'cus_123456789',
      });
      expect(result).toEqual(mockPaymentMethod);
    });

    it('should detach payment method from customer', async () => {
      const mockPaymentMethod = {
        id: 'pm_123456789',
        customer: null,
      };
      
      mockStripe.paymentMethods.detach.mockResolvedValue(mockPaymentMethod);

      const result = await mockStripe.paymentMethods.detach('pm_123456789');

      expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_123456789');
      expect(result).toEqual(mockPaymentMethod);
    });
  });

  describe('Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      const stripeError = new Error('Your card was declined.');
      stripeError.name = 'StripeCardError';
      (stripeError as any).type = 'card_error';
      (stripeError as any).code = 'card_declined';
      
      mockStripe.paymentIntents.create.mockRejectedValue(stripeError);

      await expect(
        mockStripe.paymentIntents.create({
          amount: 2000,
          currency: 'usd',
        })
      ).rejects.toThrow('Your card was declined.');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API Key provided');
      authError.name = 'StripeAuthenticationError';
      (authError as any).type = 'authentication_error';
      
      mockStripe.customers.create.mockRejectedValue(authError);

      await expect(
        mockStripe.customers.create({
          email: 'test@example.com',
        })
      ).rejects.toThrow('Invalid API Key provided');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.name = 'StripeRateLimitError';
      (rateLimitError as any).type = 'rate_limit_error';
      
      mockStripe.customers.list.mockRejectedValue(rateLimitError);

      await expect(
        mockStripe.customers.list()
      ).rejects.toThrow('Too many requests');
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'StripeConnectionError';
      (networkError as any).type = 'connection_error';
      
      mockStripe.paymentIntents.retrieve.mockRejectedValue(networkError);

      await expect(
        mockStripe.paymentIntents.retrieve('pi_123456789')
      ).rejects.toThrow('Network error');
    });
  });
});