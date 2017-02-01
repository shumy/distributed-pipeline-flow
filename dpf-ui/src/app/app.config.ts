import { UUID } from 'rts-ts-client';

export interface Config {
  host: string
  server: string
  client: string
  authProvider: string
  authClient: string
}

export let config: Config = {
  host: 'localhost:9090',
  server: 'ws://localhost:9090/clt',
  client: 'web-' + UUID.generate(),
  authProvider: 'http://localhost:8081/auth/realms/dev/',
  authClient: 'screen-dr'
}

//Toastr configs
toastr.options = {
  positionClass: 'toast-bottom-right',
  timeOut: 5000
}

window.onerror = (error) => {
  toastr.error(error)
}