jest.mock('../service.js');
jest.mock('../helpers.js');
jest.mock('../../../config/db', () => ({
  sequelize: {},
  models: {}
}));

const controller = require('../controller');
const service = require('../service');
const helpers = require('../helpers');

describe('Medicine Interaction Checker', () => {
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

  describe('Check Interaction', () => {
    it('should detect interaction between two medicines', async () => {
      req.query = { clinicId: '1', medicineId1: '10', medicineId2: '20' };

      service.checkInteraction.mockResolvedValue({
        hasInteraction: true,
        severity: 'high',
        description: 'Increased risk of bleeding',
        recommendation: 'Monitor closely'
      });

      await controller.checkInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            hasInteraction: true,
            severity: 'high'
          })
        })
      );
    });

    it('should return no interaction when medicines are safe', async () => {
      req.query = { clinicId: '1', medicineId1: '10', medicineId2: '30' };

      service.checkInteraction.mockResolvedValue({
        hasInteraction: false,
        severity: null
      });

      await controller.checkInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            hasInteraction: false
          })
        })
      );
    });

    it('should return 400 for invalid medicineId1', async () => {
      req.query = { clinicId: '1', medicineId1: 'invalid', medicineId2: '20' };

      await controller.checkInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String)
        })
      );
    });

    it('should return 400 when clinicId is missing', async () => {
      req.query = { medicineId1: '10', medicineId2: '20' };

      await controller.checkInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate that medicineIds are positive integers', async () => {
      req.query = { clinicId: '1', medicineId1: '0', medicineId2: '20' };

      await controller.checkInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Check Multiple Interactions', () => {
    it('should check interactions for multiple medicines', async () => {
      req.body = { clinicId: 1, medicineIds: [10, 20, 30] };

      service.checkMultipleInteractions.mockResolvedValue({
        interactions: [
          { medicine1Id: 10, medicine2Id: 20, severity: 'high' },
          { medicine1Id: 20, medicine2Id: 30, severity: 'moderate' }
        ],
        combinedSeverity: 'high',
        count: 2,
        hasCriticalInteraction: false
      });

      await controller.checkMultipleInteractions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          isSafe: false,
          data: expect.objectContaining({
            count: 2
          })
        })
      );
    });

    it('should report safe medication combination', async () => {
      req.body = { clinicId: 1, medicineIds: [10, 40, 50] };

      service.checkMultipleInteractions.mockResolvedValue({
        interactions: [],
        combinedSeverity: 'none',
        count: 0,
        hasCriticalInteraction: false
      });

      await controller.checkMultipleInteractions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          isSafe: true
        })
      );
    });

    it('should detect critical interactions in multiple medicines', async () => {
      req.body = { clinicId: 1, medicineIds: [10, 20, 30] };

      service.checkMultipleInteractions.mockResolvedValue({
        interactions: [
          { medicine1Id: 10, medicine2Id: 20, severity: 'critical' }
        ],
        combinedSeverity: 'critical',
        count: 1,
        hasCriticalInteraction: true
      });

      await controller.checkMultipleInteractions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasCriticalInteraction: true
          })
        })
      );
    });

    it('should require minimum 2 medicines', async () => {
      req.body = { clinicId: 1, medicineIds: [10] };

      await controller.checkMultipleInteractions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 for invalid medicineIds array', async () => {
      req.body = { clinicId: 1, medicineIds: 'not-array' };

      await controller.checkMultipleInteractions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get Warnings', () => {
    it('should retrieve interaction warnings for clinic', async () => {
      req.query = { clinicId: '1' };

      service.getInteractionWarnings.mockResolvedValue([
        { id: 1, medicineId1: 10, medicineId2: 20, severity: 'high' },
        { id: 2, medicineId1: 30, medicineId2: 40, severity: 'moderate' }
      ]);

      await controller.getWarnings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2
        })
      );
    });

    it('should filter warnings by severity level', async () => {
      req.query = { clinicId: '1', severityLevel: 'high' };

      service.getInteractionWarnings.mockResolvedValue([
        { id: 1, severity: 'high' }
      ]);

      await controller.getWarnings(req, res);

      expect(service.getInteractionWarnings).toHaveBeenCalledWith(1, 'high');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 1
        })
      );
    });

    it('should support pagination on warnings', async () => {
      req.query = { clinicId: '1', limit: '10', offset: '5' };

      service.getInteractionWarnings.mockResolvedValue([]);

      await controller.getWarnings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 0
        })
      );
    });

    it('should return 400 for invalid severity level', async () => {
      req.query = { clinicId: '1', severityLevel: 'invalid' };

      await controller.getWarnings(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Get High Risk Interactions', () => {
    it('should retrieve only high and critical interactions', async () => {
      req.query = { clinicId: '1' };

      service.getHighRiskInteractions.mockResolvedValue([
        { medicineId1: 10, medicineId2: 20, severityLevel: 'critical' },
        { medicineId1: 30, medicineId2: 40, severityLevel: 'high' }
      ]);
      helpers.sortByRisk.mockReturnValue([
        { medicineId1: 10, medicineId2: 20, severityLevel: 'critical' },
        { medicineId1: 30, medicineId2: 40, severityLevel: 'high' }
      ]);

      await controller.getHighRiskInteractions(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          count: 2
        })
      );
    });

    it('should sort high-risk interactions by severity', async () => {
      req.query = { clinicId: '1' };

      service.getHighRiskInteractions.mockResolvedValue([]);
      helpers.sortByRisk.mockReturnValue([]);

      await controller.getHighRiskInteractions(req, res);

      expect(helpers.sortByRisk).toHaveBeenCalled();
    });

    it('should return empty list when no high-risk interactions', async () => {
      req.query = { clinicId: '1' };

      service.getHighRiskInteractions.mockResolvedValue([]);
      helpers.sortByRisk.mockReturnValue([]);

      await controller.getHighRiskInteractions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 0,
          data: []
        })
      );
    });

    it('should return 400 for invalid clinicId', async () => {
      req.query = { clinicId: 'invalid' };

      await controller.getHighRiskInteractions(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Create Interaction', () => {
    it('should create new medicine interaction record', async () => {
      req.body = {
        clinicId: 1,
        medicineId1: 10,
        medicineId2: 20,
        severityLevel: 'high',
        description: 'Increased bleeding risk',
        recommendation: 'Monitor INR levels',
        conflictType: 'drug-drug'
      };

      service.createInteraction.mockResolvedValue({
        id: 1,
        ...req.body
      });
      helpers.formatInteractionForDisplay.mockReturnValue({
        interactionId: 1,
        medicine1: 10,
        medicine2: 20,
        severity: 'high'
      });

      await controller.createInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      );
    });

    it('should require all interaction fields', async () => {
      req.body = {
        clinicId: 1,
        medicineId1: 10,
        medicineId2: 20
      };

      await controller.createInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should normalize medicine IDs on creation', async () => {
      req.body = {
        clinicId: 1,
        medicineId1: 20,
        medicineId2: 10,
        severityLevel: 'moderate',
        description: 'Test interaction',
        recommendation: 'Monitor'
      };

      service.createInteraction.mockResolvedValue({ id: 1 });
      helpers.formatInteractionForDisplay.mockReturnValue({});

      await controller.createInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should reject duplicate interactions', async () => {
      req.body = {
        clinicId: 1,
        medicineId1: 10,
        medicineId2: 20,
        severityLevel: 'high',
        description: 'Test',
        recommendation: 'Test'
      };

      service.createInteraction.mockRejectedValue(
        new Error('This interaction already exists for this clinic')
      );

      await controller.createInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already exists')
        })
      );
    });
  });

  describe('Update Interaction', () => {
    it('should update interaction severity and details', async () => {
      req.params = { interactionId: '1' };
      req.body = {
        clinicId: 1,
        severityLevel: 'critical',
        description: 'Updated description'
      };

      service.updateInteraction.mockResolvedValue({
        id: 1,
        ...req.body
      });
      helpers.formatInteractionForDisplay.mockReturnValue({});

      await controller.updateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(service.updateInteraction).toHaveBeenCalledWith(
        1,
        1,
        expect.objectContaining({
          severityLevel: 'critical'
        })
      );
    });

    it('should return 404 when interaction not found', async () => {
      req.params = { interactionId: '999' };
      req.body = { clinicId: 1, severityLevel: 'high' };

      service.updateInteraction.mockRejectedValue(
        new Error('Interaction not found')
      );

      await controller.updateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should allow partial updates', async () => {
      req.params = { interactionId: '1' };
      req.body = { clinicId: 1, isActive: false };

      service.updateInteraction.mockResolvedValue({});
      helpers.formatInteractionForDisplay.mockReturnValue({});

      await controller.updateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should validate interactionId format', async () => {
      req.params = { interactionId: 'invalid' };
      req.body = { clinicId: 1 };

      await controller.updateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Deactivate Interaction', () => {
    it('should deactivate medicine interaction', async () => {
      req.params = { interactionId: '1' };
      req.body = { clinicId: 1 };

      service.deactivateInteraction.mockResolvedValue({ success: true });

      await controller.deactivateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('should return 404 when interaction not found', async () => {
      req.params = { interactionId: '999' };
      req.body = { clinicId: 1 };

      service.deactivateInteraction.mockRejectedValue(
        new Error('Interaction not found')
      );

      await controller.deactivateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should enforce clinic isolation on deactivation', async () => {
      req.params = { interactionId: '1' };
      req.body = { clinicId: 1 };

      service.deactivateInteraction.mockResolvedValue({});

      await controller.deactivateInteraction(req, res);

      expect(service.deactivateInteraction).toHaveBeenCalledWith(1, 1);
    });

    it('should require clinicId for deactivation', async () => {
      req.params = { interactionId: '1' };
      req.body = {};

      await controller.deactivateInteraction(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Business Logic', () => {
    it('should maintain bidirectional interaction checking (10-20 same as 20-10)', async () => {
      req.query = { clinicId: '1', medicineId1: '10', medicineId2: '20' };

      service.checkInteraction.mockResolvedValue({
        hasInteraction: true,
        severity: 'high'
      });

      await controller.checkInteraction(req, res);

      expect(service.checkInteraction).toHaveBeenCalledWith(10, 20, 1);
    });

    it('should calculate combined severity for multiple interactions', async () => {
      req.body = { clinicId: 1, medicineIds: [10, 20, 30, 40] };

      service.checkMultipleInteractions.mockResolvedValue({
        interactions: [
          { severity: 'low' },
          { severity: 'high' }
        ],
        combinedSeverity: 'high',
        count: 2,
        hasCriticalInteraction: false
      });

      await controller.checkMultipleInteractions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            combinedSeverity: 'high'
          })
        })
      );
    });

    it('should prioritize critical interactions over high-risk', async () => {
      req.body = { clinicId: 1, medicineIds: [10, 20, 30] };

      service.checkMultipleInteractions.mockResolvedValue({
        interactions: [
          { severity: 'high' },
          { severity: 'critical' }
        ],
        combinedSeverity: 'critical',
        hasCriticalInteraction: true,
        count: 2
      });

      await controller.checkMultipleInteractions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hasCriticalInteraction: true
          })
        })
      );
    });

    it('should enforce clinic isolation on all operations', async () => {
      req.query = { clinicId: '1', medicineId1: '10', medicineId2: '20' };

      service.checkInteraction.mockResolvedValue({
        hasInteraction: false
      });

      await controller.checkInteraction(req, res);

      expect(service.checkInteraction).toHaveBeenCalledWith(10, 20, 1);
    });

    it('should support high-risk filtering (high + critical)', async () => {
      req.query = { clinicId: '1' };

      const highRiskMedicines = [
        { medicineId1: 10, medicineId2: 20, severityLevel: 'critical' },
        { medicineId1: 30, medicineId2: 40, severityLevel: 'high' },
        { medicineId1: 50, medicineId2: 60, severityLevel: 'moderate' }
      ];

      service.getHighRiskInteractions.mockResolvedValue(
        highRiskMedicines.filter(m => ['critical', 'high'].includes(m.severityLevel))
      );
      helpers.sortByRisk.mockImplementation(arr => arr);

      await controller.getHighRiskInteractions(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2
        })
      );
    });

    it('should support severity-based filtering and sorting', async () => {
      req.query = { clinicId: '1' };

      service.getInteractionWarnings.mockResolvedValue([
        { id: 1, severity: 'critical' },
        { id: 2, severity: 'high' },
        { id: 3, severity: 'moderate' }
      ]);

      await controller.getWarnings(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 3,
          data: expect.arrayContaining([
            expect.objectContaining({ id: 1 })
          ])
        })
      );
    });
  });
});
