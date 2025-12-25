import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavComponent } from './nav.component';

describe('NavComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [NavComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(NavComponent);
    const component = fixture.componentInstance;

    expect(component).toBeTruthy();
  });
});
