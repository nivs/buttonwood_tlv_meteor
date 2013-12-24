//Bids = new Meteor.Collection("bids");
//Asks = new Meteor.Collection("asks");

//if(Meteor.is_server) 
//{
	var ExchangeRates = new Meteor.Collection("fx");
	
	Meteor.startup(function () 
	{
		Meteor.methods(
		{
			getUSDILS: function() 
			{
				//console.log("getUSDILS");
				
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
				//console.log("getBTCE_BTCUSD");
			
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
			},
			
			getBit2C_BTCILS: function()
			{
				//console.log("getBit2C_BTCILS");
			
				var now = new Date();
				var bit2c = ExchangeRates.findOne({name: 'bit2c_btcils'});
				if(!bit2c || (now - bit2c.date > 10*1000)) // cache for 10 seconds
				{
					console.log("fetching bit2c ticker");
					var result = Meteor.http.get('https://www.bit2c.co.il/Exchanges/NIS/Ticker.json');
					if(result && (result.statusCode === 200))
					{
						if(bit2c)
						{
							ExchangeRates.update(bit2c._id, {name: 'bit2c_btcils', date: now, data: result});
						}
						else
						{
							ExchangeRates.insert({name: 'bit2c_btcils', date: now, data: result});
						}
					}
					//console.log(result);
					return result;
				}
				else
				{
					//console.log("returning cached bit2c ticker");
					return bit2c.data;
				}
			}
		});
	});
//}
