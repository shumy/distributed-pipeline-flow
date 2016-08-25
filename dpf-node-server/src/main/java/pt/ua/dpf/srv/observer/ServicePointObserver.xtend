package pt.ua.dpf.srv.observer

import rt.async.pubsub.IObserver
import rt.async.pubsub.IPublisher
import rt.data.Data

@Data(metadata = false)
class ServicePointObserver implements IObserver {
	val IPublisher publisher
	
	//transient val RemoteSubscriber ro
	
	override onCreate(String inAddress) {
		println('onCreate-' + inAddress)
		/*val ro = RemoteSubscriber.B => [ address = inAddress publisher = this.publisher ]
		AsyncUtils.periodic(5000)[
			ro.next(Change.B => [ oper = Change.ADD data = #{ 'x' -> Math.random, 'y' -> Math.random } ])
		]*/
	}
	
	override onDestroy(String inAddress) {
		println('onDestroy-' + inAddress)
	}
}