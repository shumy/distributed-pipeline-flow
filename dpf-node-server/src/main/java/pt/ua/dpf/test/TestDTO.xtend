package pt.ua.dpf.test

class TestDTO {
	public val String firstName
	public val String secondName
	public val Integer age
	
	new(String firstName, String secondName, Integer age) {
		this.firstName = firstName
		this.secondName = secondName
		this.age = age
	}
}