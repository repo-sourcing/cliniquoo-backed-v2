jest.mock('../service.js');
jest.mock('../helpers.js');
jest.mock('../../../config/db', () => ({
  sequelize: {},
  models: {}
}));

const controller = require('../controller');
const service = require('../service');
const helpers = require('../helpers');

describe('Subscription Feature Gates', () => {
  let req, res;

  beforeEach(() => {
    req = { query: {}, params: {}, body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('Check Feature Access', () => {
    it('should grant access to enabled features', async () => {
      req.query = { subscriptionTierId: '1', featureKey: 'advanced_analytics' };

      service.checkFeatureAccess.mockResolvedValue({
        hasAccess: true,
        feature: { name: 'Advanced Analytics', usageLimit: 1000 }
      });

      await controller.checkFeatureAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ hasAccess: true })
        })
      );
    });

    it('should deny access to disabled features', async () => {
      req.query = { subscriptionTierId: '1', featureKey: 'premium_reports' };

      service.checkFeatureAccess.mockResolvedValue({
        hasAccess: false,
        feature: null
      });

      await controller.checkFeatureAccess(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hasAccess: false })
        })
      );
    });

    it('should return 400 for invalid subscriptionTierId', async () => {
      req.query = { subscriptionTierId: 'invalid', featureKey: 'test' };

      await controller.checkFeatureAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should require featureKey parameter', async () => {
      req.query = { subscriptionTierId: '1' };

      await controller.checkFeatureAccess(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get Available Features', () => {
    it('should retrieve all enabled features for subscription tier', async () => {
      req.query = { subscriptionTierId: '1' };

      service.getAvailableFeatures.mockResolvedValue({
        totalFeatures: 5,
        features: [
          { name: 'Analytics', key: 'analytics' },
          { name: 'Reports', key: 'reports' }
        ]
      });

      await controller.getAvailableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ totalFeatures: 5 })
        })
      );
    });

    it('should filter features by category', async () => {
      req.query = { subscriptionTierId: '1', category: 'analytics' };

      service.getAvailableFeatures.mockResolvedValue({
        totalFeatures: 3,
        features: [{ name: 'Advanced Analytics', key: 'advanced_analytics' }]
      });

      await controller.getAvailableFeatures(req, res);

      expect(service.getAvailableFeatures).toHaveBeenCalledWith(1, 'analytics');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalFeatures: 3 })
        })
      );
    });

    it('should return empty list for subscription with no features', async () => {
      req.query = { subscriptionTierId: '2' };

      service.getAvailableFeatures.mockResolvedValue({
        totalFeatures: 0,
        features: []
      });

      await controller.getAvailableFeatures(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ totalFeatures: 0 })
        })
      );
    });

    it('should return 400 for invalid category', async () => {
      req.query = { subscriptionTierId: '1', category: 'invalid_category' };

      await controller.getAvailableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get Features By Category', () => {
    it('should retrieve features in specific category', async () => {
      req.query = { subscriptionTierId: '1', category: 'billing' };

      service.getFeaturesByCategory.mockResolvedValue([
        { id: 1, name: 'Invoice Generation', key: 'invoice_gen' },
        { id: 2, name: 'Payment Tracking', key: 'payment_tracking' }
      ]);

      await controller.getFeaturesByCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2
        })
      );
    });

    it('should return empty array for category with no features', async () => {
      req.query = { subscriptionTierId: '1', category: 'messaging' };

      service.getFeaturesByCategory.mockResolvedValue([]);

      await controller.getFeaturesByCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 0,
          data: []
        })
      );
    });

    it('should require category parameter', async () => {
      req.query = { subscriptionTierId: '1' };

      await controller.getFeaturesByCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Enable Feature', () => {
    it('should enable disabled feature', async () => {
      req.body = { subscriptionTierId: 1, featureKey: 'premium_reports' };

      service.enableFeature.mockResolvedValue({ success: true, message: 'Feature enabled' });

      await controller.enableFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ success: true })
        })
      );
    });

    it('should return 404 when feature not found', async () => {
      req.body = { subscriptionTierId: 1, featureKey: 'nonexistent' };

      service.enableFeature.mockRejectedValue(
        new Error('Feature not found for this subscription tier')
      );

      await controller.enableFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should require subscriptionTierId', async () => {
      req.body = { featureKey: 'test' };

      await controller.enableFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Disable Feature', () => {
    it('should disable enabled feature', async () => {
      req.body = { subscriptionTierId: 1, featureKey: 'basic_analytics' };

      service.disableFeature.mockResolvedValue({ success: true, message: 'Feature disabled' });

      await controller.disableFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 when feature not found', async () => {
      req.body = { subscriptionTierId: 1, featureKey: 'unknown' };

      service.disableFeature.mockRejectedValue(
        new Error('Feature not found for this subscription tier')
      );

      await controller.disableFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should require featureKey', async () => {
      req.body = { subscriptionTierId: 1 };

      await controller.disableFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Create Feature', () => {
    it('should create new feature for subscription tier', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureName: 'Custom Reports',
        featureKey: 'custom_reports',
        description: 'Generate custom reports',
        category: 'analytics',
        usageLimit: 100,
        usageUnit: 'requests'
      };

      service.createFeature.mockResolvedValue({
        id: 1,
        ...req.body
      });
      helpers.formatFeatureResponse.mockReturnValue({
        id: 1,
        name: 'Custom Reports'
      });

      await controller.createFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should reject duplicate features', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureName: 'Analytics',
        featureKey: 'analytics',
        category: 'analytics'
      };

      service.createFeature.mockRejectedValue(
        new Error('This feature already exists for this subscription tier')
      );

      await controller.createFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists')
        })
      );
    });

    it('should require all mandatory fields', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureName: 'Test'
      };

      await controller.createFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Update Feature', () => {
    it('should update feature properties', async () => {
      req.params = { featureId: '1' };
      req.body = {
        subscriptionTierId: 1,
        description: 'Updated description',
        usageLimit: 500
      };

      service.updateFeature.mockResolvedValue({
        id: 1,
        ...req.body
      });
      helpers.formatFeatureResponse.mockReturnValue({});

      await controller.updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.updateFeature).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({ description: 'Updated description' })
      );
    });

    it('should return 404 when feature not found', async () => {
      req.params = { featureId: '999' };
      req.body = { subscriptionTierId: 1 };

      service.updateFeature.mockRejectedValue(
        new Error('Feature not found')
      );

      await controller.updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should allow partial updates', async () => {
      req.params = { featureId: '1' };
      req.body = {
        subscriptionTierId: 1,
        isEnabled: false
      };

      service.updateFeature.mockResolvedValue({});
      helpers.formatFeatureResponse.mockReturnValue({});

      await controller.updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should validate featureId format', async () => {
      req.params = { featureId: 'invalid' };
      req.body = { subscriptionTierId: 1 };

      await controller.updateFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get Feature Stats', () => {
    it('should return feature statistics for tier', async () => {
      req.query = { subscriptionTierId: '1' };

      service.getFeatureStats.mockResolvedValue({
        totalFeatures: 10,
        enabledFeatures: 8,
        disabledFeatures: 2,
        byCategory: { analytics: 3, billing: 2 }
      });

      await controller.getFeatureStats(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            totalFeatures: 10,
            enabledFeatures: 8
          })
        })
      );
    });

    it('should include category breakdown in stats', async () => {
      req.query = { subscriptionTierId: '1' };

      service.getFeatureStats.mockResolvedValue({
        totalFeatures: 10,
        enabledFeatures: 10,
        disabledFeatures: 0,
        byCategory: {
          analytics: 3,
          prescription: 2,
          patient: 2,
          billing: 2,
          appointment: 1
        }
      });

      await controller.getFeatureStats(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            byCategory: expect.objectContaining({
              analytics: 3
            })
          })
        })
      );
    });

    it('should return 400 for invalid subscriptionTierId', async () => {
      req.query = { subscriptionTierId: 'invalid' };

      await controller.getFeatureStats(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Bulk Enable Features', () => {
    it('should enable multiple features at once', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureKeys: ['analytics', 'reports', 'export']
      };

      service.bulkEnableFeatures.mockResolvedValue({
        enabled: 3,
        message: '3 features enabled'
      });

      await controller.bulkEnableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ enabled: 3 })
        })
      );
    });

    it('should require non-empty featureKeys array', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureKeys: []
      };

      await controller.bulkEnableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should require subscriptionTierId', async () => {
      req.body = {
        featureKeys: ['analytics']
      };

      await controller.bulkEnableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Bulk Disable Features', () => {
    it('should disable multiple features at once', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureKeys: ['premium_reports', 'api_access']
      };

      service.bulkDisableFeatures.mockResolvedValue({
        disabled: 2,
        message: '2 features disabled'
      });

      await controller.bulkDisableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ disabled: 2 })
        })
      );
    });

    it('should handle bulk operations safely', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureKeys: ['feature1', 'feature2', 'feature3', 'feature4', 'feature5']
      };

      service.bulkDisableFeatures.mockResolvedValue({
        disabled: 5,
        message: '5 features disabled'
      });

      await controller.bulkDisableFeatures(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ disabled: 5 })
        })
      );
    });

    it('should require subscriptionTierId and featureKeys', async () => {
      req.body = { featureKeys: ['test'] };

      await controller.bulkDisableFeatures(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Business Logic', () => {
    it('should support category-based feature organization', async () => {
      req.query = { subscriptionTierId: '1', category: 'billing' };

      service.getFeaturesByCategory.mockResolvedValue([
        { id: 1, name: 'Invoice Generation', category: 'billing' },
        { id: 2, name: 'Payment Tracking', category: 'billing' }
      ]);

      await controller.getFeaturesByCategory(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2,
          data: expect.arrayContaining([
            expect.objectContaining({ name: 'Invoice Generation' })
          ])
        })
      );
    });

    it('should handle subscription tier hierarchy', async () => {
      req.query = { subscriptionTierId: '1' };

      service.getAvailableFeatures.mockResolvedValue({
        totalFeatures: 3,
        features: [
          { name: 'Basic Analytics', key: 'basic_analytics' }
        ]
      });

      await controller.getAvailableFeatures(req, res);

      expect(service.getAvailableFeatures).toHaveBeenCalledWith(1, undefined);
    });

    it('should enforce feature uniqueness per tier', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureName: 'Analytics',
        featureKey: 'analytics',
        category: 'analytics'
      };

      service.createFeature.mockRejectedValue(
        new Error('This feature already exists for this subscription tier')
      );

      await controller.createFeature(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should support enabling and disabling features independently', async () => {
      // Enable scenario
      req.body = { subscriptionTierId: 1, featureKey: 'premium_reports' };
      service.enableFeature.mockResolvedValue({ success: true });

      await controller.enableFeature(req, res);

      expect(service.enableFeature).toHaveBeenCalledWith(1, 'premium_reports');

      // Reset for disable scenario
      jest.clearAllMocks();
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Disable scenario
      req.body = { subscriptionTierId: 1, featureKey: 'premium_reports' };
      service.disableFeature.mockResolvedValue({ success: true });

      await controller.disableFeature(req, res);

      expect(service.disableFeature).toHaveBeenCalledWith(1, 'premium_reports');
    });

    it('should support usage limits on features', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureName: 'API Access',
        featureKey: 'api_access',
        category: 'admin',
        usageLimit: 10000,
        usageUnit: 'requests'
      };

      service.createFeature.mockResolvedValue({
        id: 1,
        usageLimit: 10000,
        usageUnit: 'requests'
      });
      helpers.formatFeatureResponse.mockReturnValue({
        usageLimit: 10000,
        usageUnit: 'requests'
      });

      await controller.createFeature(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usageLimit: 10000
          })
        })
      );
    });

    it('should track feature reset frequency', async () => {
      req.body = {
        subscriptionTierId: 1,
        featureName: 'Monthly Reports',
        featureKey: 'monthly_reports',
        category: 'analytics',
        resetFrequency: 'monthly'
      };

      service.createFeature.mockResolvedValue({
        id: 1,
        resetFrequency: 'monthly'
      });
      helpers.formatFeatureResponse.mockReturnValue({
        resetFrequency: 'monthly'
      });

      await controller.createFeature(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resetFrequency: 'monthly'
          })
        })
      );
    });
  });
});
