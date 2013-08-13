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
            //price_str = Session.get('gox_buy');
			price_str = price_str = (Session.get('btce_buy') ? '$'+Session.get('btce_buy').toFixed(2) : Session.get('gox_buy'));
        }
		else {
			//price_str = Session.get('gox_sell');
			price_str = (Session.get('btce_sell') ? '$'+Session.get('btce_sell').toFixed(2) : Session.get('gox_sell'));
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
	Session.set('gox_last', data.return.last.display_short);
}

function refreshTicker()
{
	//console.log("refreshGox");
    Meteor.http.get('http://data.mtgox.com/api/1/BTCUSD/ticker_fast', {}, function (error, result) {
        if (result && (result.statusCode === 200))
		{		
			//console.log("refreshGox statusCode=200");
			setGox(result);
			updateExchangeRates();			
		}
		else
		{
			console.log("refreshGox statusCode="+(result?result.statusCode:"null"));
		}
    });

	//console.log("refreshBTCE");
    //Meteor.http.get('https://btc-e.com/api/2/btc_usd/ticker', {}, function (error, result) {
	Meteor.call('getBTCE_BTCUSD', function(error, result) {	
        if(result && (result.statusCode === 200))
		{
			//console.log("refreshBTCE statusCode=200");
			setBTCE(result);
			updateExchangeRates();			
		}
		else
		{
			console.log("refreshBTCE statusCode="+(result?result.statusCode:"null"));
		}
    });
}

function setBTCE(results) {
    Session.set("btce", results);
    data = JSON.parse(Session.get('btce').content);
    Session.set('btce_sell', data.ticker.sell);
    Session.set('btce_buy', data.ticker.buy);
	Session.set('btce_last', data.ticker.last);
}

function refreshUSDILS()
{
	Meteor.call('getUSDILS', function(err, response) {
		Session.set("USDILS", response);
		updateExchangeRates();			
	});	
}

var _last_exchange_rates_html = null;
var _last_exchange_rates_update = null;
function updateExchangeRates()
{
	var html = null;
	var usdils = Session.get("USDILS");
	
	if(!Session.get('btce_last'))
	{
		console.log("btce_last is null in updateExchangeRates");
	}
	else
	{			
		var usdbtc = Session.get('btce_last');
		var usdbtc_str = usdbtc.toFixed(2);
		html = "<span class='exchange'>BTC-E</span><span class='currency'>:</span> " + usdbtc_str + " <span class='currency'>USD/BTC</span>";
		
		
		if(usdils)
		{			
			var ilsbtc = usdbtc * usdils;
			html += " <span class='currency'>&bull;</span> " + ilsbtc.toFixed(2) + " <span class='currency'>ILS/BTC</span>";
		}
	}
	
	if(!Session.get('gox_last'))
	{
		console.log("gox_last is null in updateExchangeRates");
	}
	else
	{	
		if(html)
		{
			html += "<br>";
		}
		else
		{
			html = "";
		}

		var usdbtc_str = Session.get('gox_last').substr(1);
		html += "<span class='exchange'>Mt.Gox</span><span class='currency'>:</span> " + usdbtc_str + " <span class='currency'>USD/BTC</span>";
		
		if(usdils)
		{
			var usdbtc = parseFloat(usdbtc_str);
			var ilsbtc = usdbtc * usdils;
			html += " <span class='currency'>&bull;</span> " + ilsbtc.toFixed(2) + " <span class='currency'>ILS/BTC</span>";
		}
	}
	
	if(html)
	{
		if(usdils)
		{
			html += "<br><span class='ilsusd'>(" + usdils.toFixed(2) + " ILS/USD)</span>";
		}		
	}
	else
	{
		html = '<span style="color:#eee">fetching exchange rates...</span>';
	}
	
	var now = new Date();
	$("#exchange_rates").html(html);	
	if(html != _last_exchange_rates_html)
	{
		if(!_last_exchange_rates_update || (now - _last_exchange_rates_update > 1*1000))
		{
			$("#exchange_rates").animateHighlight();	
		}
		_last_exchange_rates_update = now;
		_last_exchange_rates_html = html;
	}
	else if(_last_exchange_rates_update && (now - _last_exchange_rates_update > 20*1000))
	{
		_last_exchange_rates_update = now;
		$("#exchange_rates").animateHighlight("#888");	
	}
	
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

		refreshTicker();
		window.setInterval(refreshTicker, 20*1000);	
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
    Template.bid_list.is_mine_or_admin = function () {
        if (this.name === getUsername()) {
            return "mine"
        }
        else {
            return "other"
        }
    };	
    Template.bid_list.gox_price = function () {
        //return Session.get('gox_sell');
		return (Session.get('btce_sell') ? '$'+Session.get('btce_sell').toFixed(2) : Session.get('gox_sell'));
    }
    Template.ask_list.gox_price = function () {
        //return Session.get('gox_buy');
		return (Session.get('btce_buy') ? '$'+Session.get('btce_buy').toFixed(2) : Session.get('gox_buy'));
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
    Template.ask_info.is_mine_or_admin = function () {
        return ((this.user_id === Meteor.userId()) || (getUsername() == 'nivs'));
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
					if(result && (result.statusCode === 200))
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
			},
			
			getBTCE_BTCUSD: function()
			{
				var now = new Date();
				var btce = ExchangeRates.findOne({name: 'btce_btcusd'});
				if(!btce || (now - btce.date > 10*1000)) // cache for 10 seconds
				{
					//console.log("fetching btc-e ticker");
					var result = Meteor.http.get('https://btc-e.com/api/2/btc_usd/ticker');
					if(result && (result.statusCode === 200))
					{
						if(btce)
						{
							ExchangeRates.update(btce._id, {name: 'btce_btcusd', date: now, data: result});
						}
						else
						{
							ExchangeRates.insert({name: 'btce_btcusd', date: now, data: result});
						}
					}
					//console.log(result);
					return result;
				}
				else
				{
					//console.log("returning cached btc-e ticker");
					return btce.data;
				}
			}
		});
	});
}


