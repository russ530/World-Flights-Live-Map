import { TestBed } from '@angular/core/testing';

import { Aviation } from './aviation';

describe('Aviation', () => {
  let service: Aviation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Aviation);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
