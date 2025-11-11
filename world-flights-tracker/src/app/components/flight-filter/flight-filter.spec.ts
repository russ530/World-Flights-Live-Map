import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlightFilter } from './flight-filter';

describe('FlightFilter', () => {
  let component: FlightFilter;
  let fixture: ComponentFixture<FlightFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlightFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
