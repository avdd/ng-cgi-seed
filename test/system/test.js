
describe('trivial test', function() {
  it('should call the CGI', function() {
    browser.get('/');
    expect(element(by.id('server-response')).getText())
      .toMatch('"status": 200');
  });
});
