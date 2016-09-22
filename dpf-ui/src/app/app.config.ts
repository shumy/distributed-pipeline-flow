import { UUID, ClientRouter, Pipeline }                                     from 'rts-ts-client';
import { EventsService, SubscriberService, RepositoryService }              from 'rts-ts-client';

import { AuthService }                                                      from './srv/oidcAuth.srv';
import { DicoogleService }                                                  from './srv/dicoogle.srv';

export interface Config {
  host: string
  dicoogleHost: string
}

export let config: Config = {
  host: 'localhost:9090',
  dicoogleHost: 'localhost:8080'
}

//Toastr configs
toastr.options = {
  positionClass: 'toast-bottom-right',
  timeOut: 5000
}

const authProvider = 'http://localhost:8081/auth/realms/dev/'
const authClient = 'screen-dr'

const server = 'ws://localhost:9090/clt'
const client = 'web-' + UUID.generate()

const pipeline = new Pipeline
pipeline.failHandler(error => console.log('PIPELINE-FAIL: ' + error))

export const router = new ClientRouter(server, client, pipeline)
router.authMgr = new AuthService(authProvider, authClient)

const evtSrv = new EventsService(router)
export const subSrv = new SubscriberService(router, evtSrv)
export const repoSrv = new RepositoryService(router, evtSrv)
  repoSrv.create('srv-points').connect()