/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index');
};

exports.partials = function (req, res) {
  var name = req.params.name;
  console.log("heard request for "+req.params.name)
  res.render('partials/' + req.params.name);
};