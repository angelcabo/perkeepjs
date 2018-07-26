describe('sum', function () {
  it('should return sum of arguments', function () {
    let pk = Perkeep({
      host: 'http://perkeep.test',
      user: 'user',
      pass: 'pass'
    });

    pk._discoveryConfig = {
      foo: 'bar'
    };

    chai.expect(pk.discoveryConfig).to.equal('test');
  });
});