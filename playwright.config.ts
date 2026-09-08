import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir:"./tests/browser",workers:1,timeout:60000,
  use:{baseURL:"http://localhost:5173",channel:"chrome",headless:true},
  webServer:{command:"npm run dev",url:"http://localhost:5173/api/applications",reuseExistingServer:true,timeout:120000},
});
