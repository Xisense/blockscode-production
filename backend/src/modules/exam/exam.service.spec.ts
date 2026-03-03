import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';

describe('ExamService', () => {
  let service: ExamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExamService],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('IP whitelist helpers', () => {
    it('parseAllowedIPs should split on commas/spaces/semicolons', () => {
      const parser = (service as any).parseAllowedIPs.bind(service);
      expect(parser('192.168.0.1')).toEqual(['192.168.0.1']);
      expect(parser('192.168.0.1,10.0.0.1')).toEqual(['192.168.0.1', '10.0.0.1']);
      expect(parser('192.168.0.1 10.0.0.1')).toEqual(['192.168.0.1', '10.0.0.1']);
      expect(parser(' 192.168.0.1 ; 10.0.0.1\n')).toEqual(['192.168.0.1', '10.0.0.1']);
      expect(parser('')).toEqual([]);
      expect(parser(null)).toEqual([]);
      expect(parser(undefined)).toEqual([]);
    });

    it('isIpAllowed should allow when no restrictions', () => {
      const checker = (service as any).isIpAllowed.bind(service);
      expect(checker('1.2.3.4', '')).toBe(true);
      expect(checker('1.2.3.4', null)).toBe(true);
      expect(checker('1.2.3.4', undefined)).toBe(true);
    });

    it('isIpAllowed should validate against list', () => {
      const checker = (service as any).isIpAllowed.bind(service);
      expect(checker('192.168.0.1', '192.168.0.1')).toBe(true);
      expect(checker('192.168.0.1', '192.168.0.1,10.0.0.1')).toBe(true);
      expect(checker('10.0.0.2', '192.168.0.1,10.0.0.1')).toBe(false);
    });
  });
});
