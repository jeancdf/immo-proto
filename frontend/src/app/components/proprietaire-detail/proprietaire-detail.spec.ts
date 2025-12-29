import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProprietaireDetail } from './proprietaire-detail';

describe('ProprietaireDetail', () => {
  let component: ProprietaireDetail;
  let fixture: ComponentFixture<ProprietaireDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProprietaireDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProprietaireDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
