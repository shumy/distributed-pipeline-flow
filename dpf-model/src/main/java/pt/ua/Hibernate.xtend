package pt.ua

import org.hibernate.Session
import org.hibernate.SessionFactory
import org.hibernate.cfg.Configuration

class Hibernate {
	static var SessionFactory tlFactory
	//static val tlSession = new ThreadLocal<Session>
	
	static def config((Configuration) => void onConfig) {
		val config = new Configuration
		onConfig.apply(config)
		tlFactory = config.buildSessionFactory
	}
	
	static def session((Session) => void onSession) {
		val session = tlFactory.openSession
		try {
			onSession.apply(session)
		} catch(Exception ex) {
			ex.printStackTrace
			session.transaction.rollback
		} finally {
			session.close
		}
	}
}