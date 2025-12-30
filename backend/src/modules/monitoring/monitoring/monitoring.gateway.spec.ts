import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringGateway } from './monitoring.gateway';

describe('MonitoringGateway', () => {
  let gateway: MonitoringGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringGateway],
    }).compile();

    gateway = module.get<MonitoringGateway>(MonitoringGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
