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