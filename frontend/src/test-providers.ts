// src/test-providers.ts
import type { Provider, EnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';

const providers: Array<Provider | EnvironmentProviders> = [
  provideHttpClient(),
];

export default providers;
