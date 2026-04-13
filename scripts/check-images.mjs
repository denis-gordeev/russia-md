#!/usr/bin/env node

// Keep the existing npm entrypoint working while the active implementation
// still lives under legacy-content/.
import '../legacy-content/scripts/all-scripts/check-images.mjs';
