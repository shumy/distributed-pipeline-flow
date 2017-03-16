// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `angular-cli.json`.

export const environment = {
  production: false,
  base: '/screen-dr',
  server: 'ws://localhost/screen-dr/clt',
  authProfile: 'http://localhost/keycloak/auth/realms/dev/account',
  authProvider: 'http://localhost/keycloak/auth/realms/dev/',
  authClient: 'screen-dr',
  viewer: 'http://demo.dicoogle.com/viewer'
};
