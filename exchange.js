Bids = new Meteor.Collection("bids");
Asks = new Meteor.Collection("asks");
// Add a marker to the map and push to the array.

/*function getLocation() {
    navigator.geolocation.watchPosition(setLocation, noLocation);
}
function setLocation(position) {
    Session.set("location", position.coords);
}
function noLocation() {
    alert('Could not find location');
    Session.set('location', {longitude: null, latitude: null});
}*/

function click_input_add(kind) {
    var user = Meteor.user();
    if (user === null) {
        alert('login to put your order on the book');
        return;
    }
    var name = user.username;
    //var email = user.emails[0].address;
	var price_str = document.getElementById(kind + '_price').value;
	if(!price_str)
	{
        if (kind == 'ask') {
            price_str = Session.get('gox_buy');
        }
		else {
			price_str = Session.get('gox_sell');
		}
		if(price_str) price_str = price_str.substr(1);		
    }
    var price = parseFloat(price_str);
    //console.log(price);
	var size_str = document.getElementById(kind + '_size').value;
    var size = parseFloat(size_str);
    //console.log(size);
    //console.log("user.id is " + user._id);

    if (!price_str || !size_str || (price < .01) || (size < .01)) 
	{
        alert('price or size too small');
    }
    else {
        var position = Session.get("location") ? [Session.get("location").latitude, Session.get("location").longitude] : null;
        if (kind == 'ask') {
            Asks.insert({user_id: user._id, name: name, price: price, size: size, location: position});
        }
        if (kind == 'bid') {
            Bids.insert({user_id: user._id, name: name, price: price, size: size, location: position});
        }
    }
    document.getElementById(kind + '_price').value = '';
    document.getElementById(kind + '_size').value = '';
}

function setGox(results) {
    Session.set("gox", results);
    data = JSON.parse(Session.get('gox').content);
    Session.set('gox_sell', data.return.buy.display_short);
    Session.set('gox_buy', data.return.sell.display_short);
	Session.set('gox_last', data.return.sell.display_short);
}

function refreshGox()
{
	//console.log("refreshGox");
    Meteor.http.get('http://data.mtgox.com/api/1/BTCUSD/ticker_fast', {}, function (error, result) {
        if (result.statusCode === 200) 
		{
			//console.log("refreshGox statusCode=200");
			setGox(result);
			updateExchangeRates();			
		}
		else
		{
			console.log("refreshGox statusCode="+result.statusCode);
		}
    });
}

function refreshUSDILS()
{
	Meteor.call('getUSDILS', function(err, response) {
		Session.set("USDILS", response);
		updateExchangeRates();			
	});	
}

function updateExchangeRates()
{
	if(!Session.get('gox_last'))
	{
		console.log("gox_last is null in updateExchangeRates");
		return;
	}
	
	var usdbtc_str = Session.get('gox_last').substr(1);
	var html = usdbtc_str + " USD/BTC";
	
	var usdils = Session.get("USDILS");
	if(usdils)
	{
		var usdbtc = parseFloat(usdbtc_str);
		var ilsbtc = usdbtc * usdils;
		html += " &bull; " + ilsbtc.toFixed(2) + " ILS/BTC (" + usdils.toFixed(2) + " ILS/USD)";
	}
	
	$("#exchange_rates").html(html).animateHighlight();	
	//console.log("updateExchangeRates: " + html);
}

if(Meteor.isClient) 
{
    function getUsername() {
        var user = Meteor.user();
        if (user === null || typeof user === 'undefined') {
            return "";
        }
        return user.username;
    }
	
	$.fn.animateHighlight = function(highlightColor, duration) {
		var highlightBg = highlightColor || "#FFFF9C";
		var animateMs = duration || 100;
		var originalBg = this.attr("animateHighlight_originalBg");
		if(!originalBg)
		{
			originalBg = this.css("background-color");
			this.attr("animateHighlight_originalBg", originalBg);
		}
		this.stop().animate({backgroundColor: highlightBg}, animateMs).animate({backgroundColor: originalBg}, animateMs);
	};	

	$(function(){
		refreshUSDILS();
		window.setInterval(refreshUSDILS, 60*1000);

		refreshGox();
		window.setInterval(refreshGox, 20*1000);	
	});

    Accounts.ui.config(
        {passwordSignupFields: 'USERNAME_AND_OPTIONAL_EMAIL'}
    );
    
	/*getLocation();*/

    Template.bid_list.username = getUsername;
    Template.ask_list.username = getUsername;
    Template.bid_list.bids = function () {
        return Bids.find({}, {sort: {price: -1}});
    };
    Template.bid_list.is_mine = function () {
        if (this.name === getUsername()) {
            return "mine"
        }
        else {
            return "other"
        }
    };
    Template.bid_list.gox_price = function () {
        return Session.get('gox_sell');
    }
    Template.ask_list.gox_price = function () {
        return Session.get('gox_buy');
    }
    Template.ask_list.is_mine = function () {
        if (this.name === getUsername()) {
            return "mine"
        }
        else {
            return "other"
        }
    };
    Template.ask_info.is_mine = function () {
        return (this.user_id === Meteor.userId());
    };
	Template.ask_info.price_str = function () {
        return this.price ? this.price.toFixed(2) : 0;
    };
	Template.ask_info.size_str = function () {
        return this.size ? this.size.toFixed(2) : 0;
    };
    Template.ask_list.asks = function () {
        return Asks.find({}, {sort: {price: 1}});
    };
    Template.ask_list.events({
        'click input.add': function () {
            click_input_add("ask");
        }
    });
    Template.bid_list.events({
        'click input.add': function () {
            click_input_add("bid");
        }
    });
    Template.ask_list.events({
        'click input.remove': function () {
            Asks.remove(this._id);
        },
        'click input.up_price': function () {
            Asks.update(this._id, {$inc: {price: 0.10}})
        },
        'click input.down_price': function () {
            Asks.update(this._id, {$inc: {price: -0.10}})
        },
        'click input.up_size': function () {
            Asks.update(this._id, {$inc: {size: 0.1}})
        },
        'click input.down_size': function () {
            Asks.update(this._id, {$inc: {size: -0.1}})
        }
    });
    Template.body.getAllOrders = function () {
        getAllOrders();
    };
    Template.bid_list.events({
        'click input.remove': function () {
            Bids.remove(this._id);
        },
        'click input.up_price': function () {
            Bids.update(this._id, {$inc: {price: 1.0}})
        },
        'click input.down_price': function () {
            Bids.update(this._id, {$inc: {price: -1.0}})
        },
        'click input.up_size': function () {
            Bids.update(this._id, {$inc: {size: .1}})
        },
        'click input.down_size': function () {
            Bids.update(this._id, {$inc: {size: -.1}})
        }
    });
}

if(Meteor.is_server) 
{
	var ExchangeRates = new Meteor.Collection("fx");
	
	Meteor.startup(function () 
	{
		Meteor.methods(
		{
			getUSDILS: function() 
			{
				// http://openexchangerates.org/api/latest.json?app_id=d725d8e16f4842f399b61e5ab7a21140
				var now = new Date();
				var rates = null;
				var fx = ExchangeRates.findOne({name: 'fx'});
				//console.log(fx ? fx.date : "not found");
				if(!fx || (now - fx.date > 60*60*1000)) // cache for 1 hour
				{
					var result = Meteor.http.get('http://openexchangerates.org/api/latest.json?app_id=d725d8e16f4842f399b61e5ab7a21140');
					//console.log(result.statusCode);
					if(result.statusCode === 200) 
					{
						var data = JSON.parse(result.content);
						rates = data.rates;
					}
					else
					{
						//throw new Meteor.Error(500, "openexchangerates returned " + result.statusCode);
						return null;
					}
					
					if(fx)
					{
						ExchangeRates.update(fx._id, {name: 'fx', date: now, rates: rates});
					}
					else
					{
						ExchangeRates.insert({name: 'fx', date: now, rates: rates});
					}
				}
				else
				{
					rates = fx.rates;
				}
				
				//console.log(rates.ILS);				
				return rates.ILS;
			}
		});
	});
}


