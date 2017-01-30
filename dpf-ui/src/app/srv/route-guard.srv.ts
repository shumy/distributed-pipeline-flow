import { Injectable }                   from '@angular/core';
import { CanActivate }                  from '@angular/router';
import { ClientRouter, IAuthManager }   from 'rts-ts-client';

@Injectable()
export class RouteGuard implements CanActivate {
  auth: IAuthManager

  constructor(router: ClientRouter) {
    this.auth = router.authMgr
  }

  canActivate() {
    return this.auth.isLogged
  }
}