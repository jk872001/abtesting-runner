import axios from "axios";
import blueImp from "blueimp-md5"
const md5 = blueImp.md5 || blueImp; 

 function initTest (config) {
  var defaultWeight = 0.5;
  var accumulativeWeight = 0;

  if(!Array.isArray(config))
      throw Error("Module not configured. Check your configuration.");

  // If no weight is provided, we give a static weight
  var totalWeight = config.map(function (o) {
      return isFinite(o.weight) ? o.weight : defaultWeight;
  }).reduce(function (a, b) {
      return a + b
  });

  var tests = config.map(function (test) {
      if(test.name && typeof test.name === 'string') {
          return {
              // Weight from 0..1
              weight: (isFinite(test.weight) ? test.weight : defaultWeight) / totalWeight,
              name: test.name
          }
      }
  }).sort(function (a, b) {
      return b.weight - a.weight
  });

  tests.forEach(function (o) {
      o.weight += accumulativeWeight
      accumulativeWeight = o.weight
  });
  return tests;
};
 const ABClient= {
   getSettings : async (sdkKey) => {
    // api call to get campaign data
    try {
        const response = await fetch(`http://localhost:3000/campaign/sdk/${sdkKey}`);
        if (!response.ok) {
          throw new Error('Request failed');
        }
        const data = await response.json();
        return data
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
      }
  },
   launchCampaign : (settingsFile, campaignKey) => {
    const campaign=settingsFile.filter((ele)=>ele.campaignKey===campaignKey)[0]
    return {
      specificCampaign: () => {
        return campaign
      },
      track: async() => {
        //  api call to dumb the data in database
         const track= {event:'show_variation', variation :test, campaign:"camp1", userId:"Jitesh",timeData:new Date()}
  const response= await axios.get('http://localhost:3000/tracking/track', {params:track});
  console.log("response",response.data)
      },
      getVariationName: async(uniqueId) => {
        //  api call to dumb the data in database
        // return testObject.getVariations(uniqueId)
        const controlObj={
            name:"Control",
            weight:campaign.controlPercent/100
         }
         const transformedArr = campaign.variations.map(obj => {
            const { variationsPercent, label } = obj;
            return {name: label, weight: variationsPercent/100 };
          });
          const variationsArr=[...transformedArr,controlObj]
          //  console.log("variationsArr", variationsArr)
           let testObject;
           if(!testObject){

            testObject =  createTest(campaign.campaignKey, variationsArr);
          }
         return testObject.getVariations(uniqueId)
      },


    };
    
  }
 
}

function createTest (name, config) {
    // console.log(name,config)
    if(typeof name !== 'string') {
        throw Error('Insert a valid name for the test');
    }

    var testData = initTest(config);
    // console.log("testData",testData)
    // return
    var testName = name;

    var getName = function () {
        return name;
    };

    var getVariations = function (user) {
        if(user === undefined || typeof user !== 'string')
            throw Error("Undefined user to give it a random group");

        var hexMD5hash = md5(testName, user).substr(0,8);
        var hashAsInt = parseInt("0x" + hexMD5hash, 16);
        var maxInt = parseInt("0xffffffff", 16);
        var random = hashAsInt / maxInt;

        var filtered = testData.filter(function (t) {
            return t.weight > random;
        });
        if(filtered.length === 0)
            throw Error('Error filtering the tests');

        return filtered[0].name;

    };

    var test = function (testGroupName, functions, that) {
        if(typeof testGroupName !== 'string')
            throw Error('Test Group is not a string');

        if(!Array.isArray(functions))
            throw Error('Introduce an array of functions as a second parameter');

        if(functions.length !== testData.length)
            throw Error('The number of functions does not match the number of test groups');

        var pluckedValues = testData.map(function (data) {
            return data.name;
        });
        var index = pluckedValues.indexOf(testGroupName);

        if(index === -1)
            throw Error('Test Group not found');

        if(that === undefined)
            that = this;

        functions[index].apply(that, functions[index].arguments);
    };

    return {
        getName: getName,
        getVariations: getVariations,
        test: test
    }
}
export default ABClient;
