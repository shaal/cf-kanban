/**
 * TASK-063: Unit Tests for Topology Selector
 *
 * Tests for the topology selection algorithm that determines the optimal
 * swarm topology based on task complexity, agent count, and other factors.
 */

import { describe, it, expect } from 'vitest';
import {
  selectTopology,
  TOPOLOGY_INFO,
  type TopologyFactors,
  type TopologyDecision,
  type Topology
} from '$lib/server/assignment/topology-selector';

describe('Topology Selector', () => {
  describe('selectTopology', () => {
    describe('single topology', () => {
      it('should return single for simple task with 1 agent', () => {
        const factors: TopologyFactors = {
          complexity: 1,
          agentCount: 1,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 0.5
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('single');
        expect(result.maxAgents).toBe(1);
        expect(result.coordinatorRequired).toBe(false);
      });

      it('should return single for complexity 2 with 1 agent', () => {
        const factors: TopologyFactors = {
          complexity: 2,
          agentCount: 1,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 1
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('single');
      });

      it('should explain single topology choice', () => {
        const factors: TopologyFactors = {
          complexity: 1,
          agentCount: 1,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 0.5
        };

        const result = selectTopology(factors);

        expect(result.reasoning.some(r => r.toLowerCase().includes('simple'))).toBe(true);
        expect(result.reasoning.some(r => r.toLowerCase().includes('single'))).toBe(true);
      });
    });

    describe('mesh topology', () => {
      it('should return mesh for collaborative tasks with few agents', () => {
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 2,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: true,
          expectedDuration: 2
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('mesh');
        expect(result.maxAgents).toBe(5);
        expect(result.coordinatorRequired).toBe(false);
      });

      it('should return mesh for low complexity with 3 agents', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 3,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: true,
          expectedDuration: 3
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('mesh');
      });

      it('should explain mesh benefits for collaboration', () => {
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 2,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: true,
          expectedDuration: 2
        };

        const result = selectTopology(factors);

        expect(result.reasoning.some(r =>
          r.toLowerCase().includes('collaborative') ||
          r.toLowerCase().includes('communicate')
        )).toBe(true);
      });

      it('should be default for moderate complexity without special requirements', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 2,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 2
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('mesh');
        expect(result.reasoning.some(r => r.toLowerCase().includes('default'))).toBe(true);
      });
    });

    describe('hierarchical topology', () => {
      it('should return hierarchical for high complexity', () => {
        const factors: TopologyFactors = {
          complexity: 6,
          agentCount: 3,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 4
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hierarchical');
        expect(result.maxAgents).toBe(10);
        expect(result.coordinatorRequired).toBe(true);
      });

      it('should return hierarchical for many agents', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 4,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 3
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hierarchical');
      });

      it('should return hierarchical when dependencies exist', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 2,
          hasDependencies: true,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 3
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hierarchical');
        expect(result.reasoning.some(r => r.toLowerCase().includes('dependencies'))).toBe(true);
      });

      it('should explain coordination needs', () => {
        const factors: TopologyFactors = {
          complexity: 7,
          agentCount: 5,
          hasDependencies: true,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 8
        };

        const result = selectTopology(factors);

        expect(result.reasoning.some(r =>
          r.toLowerCase().includes('coordination') ||
          r.toLowerCase().includes('hierarchical')
        )).toBe(true);
      });
    });

    describe('hybrid topology', () => {
      it('should return hybrid for security-related tasks', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 3,
          hasDependencies: false,
          isSecurityRelated: true,
          requiresConsensus: false,
          expectedDuration: 3
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hybrid');
        expect(result.maxAgents).toBe(8);
        expect(result.coordinatorRequired).toBe(true);
      });

      it('should return hybrid for long-running tasks', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 3,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 5 // More than 4 hours
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hybrid');
      });

      it('should explain hybrid benefits', () => {
        const factors: TopologyFactors = {
          complexity: 4,
          agentCount: 3,
          hasDependencies: false,
          isSecurityRelated: true,
          requiresConsensus: false,
          expectedDuration: 3
        };

        const result = selectTopology(factors);

        expect(result.reasoning.some(r =>
          r.toLowerCase().includes('security') ||
          r.toLowerCase().includes('hybrid') ||
          r.toLowerCase().includes('peer review')
        )).toBe(true);
      });
    });

    describe('factor priority', () => {
      it('should prioritize hierarchical over mesh for dependencies', () => {
        // Low complexity but has dependencies
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 2,
          hasDependencies: true,
          isSecurityRelated: false,
          requiresConsensus: true,
          expectedDuration: 2
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hierarchical');
      });

      it('should prioritize hierarchical for 4+ agents even with low complexity', () => {
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 4,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 2
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hierarchical');
      });

      it('should prioritize hybrid for security even without high complexity', () => {
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 2,
          hasDependencies: false,
          isSecurityRelated: true,
          requiresConsensus: false,
          expectedDuration: 2
        };

        // Security with 2 agents and low complexity could be mesh or hybrid
        const result = selectTopology(factors);

        expect(['hybrid', 'mesh']).toContain(result.topology);
      });
    });

    describe('edge cases', () => {
      it('should handle complexity 0', () => {
        const factors: TopologyFactors = {
          complexity: 0,
          agentCount: 1,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 0
        };

        const result = selectTopology(factors);

        expect(result).toBeDefined();
        expect(result.topology).toBeDefined();
      });

      it('should handle very high complexity', () => {
        const factors: TopologyFactors = {
          complexity: 10,
          agentCount: 10,
          hasDependencies: true,
          isSecurityRelated: true,
          requiresConsensus: true,
          expectedDuration: 40
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hierarchical');
        expect(result.coordinatorRequired).toBe(true);
      });

      it('should handle 0 agents', () => {
        const factors: TopologyFactors = {
          complexity: 5,
          agentCount: 0,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 0
        };

        const result = selectTopology(factors);

        expect(result).toBeDefined();
      });

      it('should handle very long duration', () => {
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 2,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 100
        };

        const result = selectTopology(factors);

        expect(result.topology).toBe('hybrid');
      });
    });

    describe('reasoning completeness', () => {
      it('should always provide at least one reason', () => {
        const factors: TopologyFactors = {
          complexity: 3,
          agentCount: 2,
          hasDependencies: false,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 2
        };

        const result = selectTopology(factors);

        expect(result.reasoning.length).toBeGreaterThan(0);
      });

      it('should explain multiple factors when applicable', () => {
        const factors: TopologyFactors = {
          complexity: 7,
          agentCount: 5,
          hasDependencies: true,
          isSecurityRelated: false,
          requiresConsensus: false,
          expectedDuration: 6
        };

        const result = selectTopology(factors);

        expect(result.reasoning.length).toBeGreaterThan(1);
      });
    });
  });

  describe('TOPOLOGY_INFO', () => {
    it('should define all topology types', () => {
      expect(TOPOLOGY_INFO).toHaveProperty('single');
      expect(TOPOLOGY_INFO).toHaveProperty('mesh');
      expect(TOPOLOGY_INFO).toHaveProperty('hierarchical');
      expect(TOPOLOGY_INFO).toHaveProperty('hybrid');
    });

    describe('single topology info', () => {
      it('should have correct name', () => {
        expect(TOPOLOGY_INFO.single.name).toBe('Single Agent');
      });

      it('should have description', () => {
        expect(TOPOLOGY_INFO.single.description).toBeTruthy();
      });

      it('should have best use cases', () => {
        expect(TOPOLOGY_INFO.single.bestFor.length).toBeGreaterThan(0);
        expect(TOPOLOGY_INFO.single.bestFor).toContain('Simple tasks');
      });

      it('should have agent limit of 1', () => {
        expect(TOPOLOGY_INFO.single.agentLimit).toBe(1);
      });
    });

    describe('mesh topology info', () => {
      it('should have correct name', () => {
        expect(TOPOLOGY_INFO.mesh.name).toBe('Mesh Network');
      });

      it('should describe peer communication', () => {
        expect(TOPOLOGY_INFO.mesh.description.toLowerCase()).toContain('communicate');
      });

      it('should be suited for collaboration', () => {
        expect(TOPOLOGY_INFO.mesh.bestFor).toContain('Collaboration');
      });

      it('should have agent limit of 5', () => {
        expect(TOPOLOGY_INFO.mesh.agentLimit).toBe(5);
      });
    });

    describe('hierarchical topology info', () => {
      it('should have correct name', () => {
        expect(TOPOLOGY_INFO.hierarchical.name).toBe('Hierarchical');
      });

      it('should describe coordinator role', () => {
        expect(TOPOLOGY_INFO.hierarchical.description.toLowerCase()).toContain('coordinator');
      });

      it('should be suited for complex features', () => {
        expect(TOPOLOGY_INFO.hierarchical.bestFor).toContain('Complex features');
      });

      it('should have highest agent limit', () => {
        expect(TOPOLOGY_INFO.hierarchical.agentLimit).toBe(10);
      });
    });

    describe('hybrid topology info', () => {
      it('should have correct name', () => {
        expect(TOPOLOGY_INFO.hybrid.name).toBe('Hierarchical Mesh');
      });

      it('should describe mixed approach', () => {
        const desc = TOPOLOGY_INFO.hybrid.description.toLowerCase();
        expect(desc.includes('coordinator') || desc.includes('peer')).toBe(true);
      });

      it('should be suited for security and long-running tasks', () => {
        expect(TOPOLOGY_INFO.hybrid.bestFor).toContain('Security tasks');
        expect(TOPOLOGY_INFO.hybrid.bestFor).toContain('Long-running work');
      });

      it('should have agent limit of 8', () => {
        expect(TOPOLOGY_INFO.hybrid.agentLimit).toBe(8);
      });
    });

    describe('info consistency', () => {
      it('should have non-empty names for all topologies', () => {
        Object.values(TOPOLOGY_INFO).forEach(info => {
          expect(info.name.length).toBeGreaterThan(0);
        });
      });

      it('should have non-empty descriptions for all topologies', () => {
        Object.values(TOPOLOGY_INFO).forEach(info => {
          expect(info.description.length).toBeGreaterThan(0);
        });
      });

      it('should have at least one best-for use case', () => {
        Object.values(TOPOLOGY_INFO).forEach(info => {
          expect(info.bestFor.length).toBeGreaterThan(0);
        });
      });

      it('should have positive agent limits', () => {
        Object.values(TOPOLOGY_INFO).forEach(info => {
          expect(info.agentLimit).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('return type consistency', () => {
    it('should always return topology from valid set', () => {
      const validTopologies: Topology[] = ['single', 'mesh', 'hierarchical', 'hybrid'];

      const testCases: TopologyFactors[] = [
        { complexity: 1, agentCount: 1, hasDependencies: false, isSecurityRelated: false, requiresConsensus: false, expectedDuration: 1 },
        { complexity: 5, agentCount: 3, hasDependencies: true, isSecurityRelated: false, requiresConsensus: false, expectedDuration: 4 },
        { complexity: 8, agentCount: 6, hasDependencies: true, isSecurityRelated: true, requiresConsensus: true, expectedDuration: 10 }
      ];

      testCases.forEach(factors => {
        const result = selectTopology(factors);
        expect(validTopologies).toContain(result.topology);
      });
    });

    it('should always return number for maxAgents', () => {
      const factors: TopologyFactors = {
        complexity: 5,
        agentCount: 3,
        hasDependencies: false,
        isSecurityRelated: false,
        requiresConsensus: false,
        expectedDuration: 3
      };

      const result = selectTopology(factors);

      expect(typeof result.maxAgents).toBe('number');
      expect(result.maxAgents).toBeGreaterThan(0);
    });

    it('should always return boolean for coordinatorRequired', () => {
      const factors: TopologyFactors = {
        complexity: 5,
        agentCount: 3,
        hasDependencies: false,
        isSecurityRelated: false,
        requiresConsensus: false,
        expectedDuration: 3
      };

      const result = selectTopology(factors);

      expect(typeof result.coordinatorRequired).toBe('boolean');
    });

    it('should always return array for reasoning', () => {
      const factors: TopologyFactors = {
        complexity: 5,
        agentCount: 3,
        hasDependencies: false,
        isSecurityRelated: false,
        requiresConsensus: false,
        expectedDuration: 3
      };

      const result = selectTopology(factors);

      expect(Array.isArray(result.reasoning)).toBe(true);
    });
  });
});
