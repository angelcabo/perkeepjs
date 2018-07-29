describe('sum', function () {
  it('should return sum of arguments', function (done) {
    // fetchMock.get('localhost:8080', {hello: 'world'});

    let pk = Perkeep({
      host: 'http://localhost:8080',
      user: 'user',
      pass: 'pass'
    });

    return pk.discover().then(function (discoveryConfig) {
      pk.discoveryConfig = discoveryConfig;

      let result = chai.expect(pk.discoveryConfig).to.equal('test');
      console.log(result);
      done();
    }).catch(done);
  });
});