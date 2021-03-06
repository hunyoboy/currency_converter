/*
 * Author: Joel Capillo
 * 
 *
 * Project Name: Currency Converter
 * Version: 1.0
 *
 */
ConverterApp.directive('chosen',function(){
   var linker = function(scope,element,attrs){
       
       var list = attrs['chosen'];
    
       scope.$watch(list,function(){
	   element.trigger('chosen:updated');
       });
       
       scope.$watch(attrs['ngModel'], function() {          
           element.trigger('chosen:updated');
       });

       element.chosen();
   };
   
   return{
     restrict:'A',
     link: linker
   };
});

//directive for executing function on keypress
ConverterApp.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keyup keypress", function (event) {          
            scope.$apply(function (){                
                scope.$eval(attrs.ngEnter);
            });
        });
    };
});
 


/**
 * Used to restrict user for entering non-numeric inputs
 * Used as client-max 
 * @param {type} clientMax the name of directive
 * 
 * 
 */
ConverterApp.directive('amountConvert', function() {
  return {
    require: 'ngModel',
    link: function (scope, element, attr, ngModelCtrl) {
      function fromUser(text) {
        if(!text)
            return false;
        
        var transformedInput = text.replace(/[^0-9.]/g, '');//replace blank all non-numeric
        
        var count = 0;
        if(transformedInput){
            if(Math.floor(transformedInput) != transformedInput)
                 count = transformedInput.toString().split(".").length;
            
        }
        
        if(count > 2){
            transformedInput = transformedInput.substring(0,transformedInput.lastIndexOf('.'));
        }
        
        if(transformedInput !== text) {           
            ngModelCtrl.$setViewValue(transformedInput);
            ngModelCtrl.$render();
        }
        
        return transformedInput;  // or return Number(transformedInput)
      }
      ngModelCtrl.$parsers.push(fromUser);
    }
  }; 
});


//main page controller
function page_controller($scope, $http){
    
    var currencies_url = '../web/api/load'; //api for retrieving currencies
    
    $scope.amount = null;    
    $scope.currency_code_input = null;				 
    $scope.currency_code_output = null;
    $scope.currencies = [];
    $scope.resultMessage = [];
    $scope.showResult = false;
    $scope.resultAmount = null;
  
    
    //initialize on page load
    $scope.init = function() {	
        retrieveCurrencies();	 
    };
    
    
    $scope.filterAmount = function(amount){
      if(!amount){
         return '';
      }
      else
       return amount;
    };
    
    //watch for a change in value on input currecncy select
    $scope.$watchCollection('currency_code_input', function() {
	convert();
    });
    
    //watch for a change in value on output currecncy select
    $scope.$watchCollection('currency_code_output', function() {
        convert();
    });
    
    //creates the url for the flag icon
    $scope.getFlag = function(symbol){
        
        if(undefined !== symbol && symbol && symbol.length > 0){               
            var url = 'http://s.xe.com/v2/themes/xe/images/flags/big/'+symbol.toLowerCase()+'.png';
            return url;
        }
       
    };
    
    
    $scope.convertNow = function(){
      convert();
    };
    
    //the main currency conversion process
    var convert = function(){
	
	if($scope.currencies.length === 0)
	    return false;
	
	if($scope.currency_code_input === null)
        {
          $scope.showResult = false;
          handleResponse('error','Please select an input currency.');
          return false;
        }
	  
	
	if($scope.currency_code_output === null)
	{
          $scope.showResult = false;
          handleResponse('error','Please select an output currency.');
          return false;
        }
       
	if($scope.amount == null || !$scope.amount || $scope.amount == '' || $scope.amount == 0)
        {
          $scope.showResult = false;
	  handleResponse('error','Please enter a valid amount.');
          return false;
        }
        
        var input_code = $scope.currency_code_input.currency_code;
        var output_code = $scope.currency_code_output.currency_code;	
	
	
        //get the rates
        var input_rate = $scope.currency_code_input.rate;
        var output_rate = $scope.currency_code_output.rate;

        if (!input_rate || !output_rate || 0 === input_rate || 0 === output_rate) 
        {
          $scope.showResult = false;
          handleResponse('error','Sorry, no available data for conversion.');
          return false;
        }
       
        var output = processConversion($scope.amount,output_rate,input_rate);
        $scope.resultAmount = output.toFixed(2); 
        
        if(undefined != output && output && output > 0)
        {
           $scope.showResult = true; //display result
        }
       
        $scope.resultMessage = [];
       
    };
    
    
    /**
     * Do the conversion using the given rates from the base currency
     *
     * @param float input_value the value to convert
     * @param float output_rate the base rate for the output currency
     * @param float input_rate the base rate for the input currency
     */
    var processConversion = function(input_value, output_rate, input_rate){
	  return (input_value*(output_rate/input_rate));
     };
    
    //resets values back to original form
    $scope.reset = function(){
	$scope.showResult = false;	
	$scope.resultMessage = [];
	$scope.resultAmount = null;
    };     
    
    /**
     * Performs ajax call and fill-up the select input control with currency data.
     * 
     * @returns {undefined}
     */
    var retrieveCurrencies = function(){ 
       
        $.blockUI({
            css: { 
            border: 'none', 
            padding: '5px', 
            backgroundColor: 'transparent', 
            '-webkit-border-radius': '10px', 
            '-moz-border-radius': '10px', 
            opacity: .5, 
            color: '#fff' 
              },
            message: "Loading data........"
         }); 
    
         $http.get(currencies_url).success(function(data) {            
             if(!data.error){                
                    $scope.currencies = data.data;
		   //assign default values
		   assignDefaultValues($scope.currencies,1.00);
                   $.unblockUI();
            }
            else
               //show the result container
               handleResponse('error',data.error.message);      
         }).error(function() {            
               handleResponse('error','Something\'s wrong happened.');
         });         
    };
    
    //error handler
     var handleResponse = function(type,message){
         var response = new Array();
         response.type = type;
         var response_body = {responseMsg:message};
         response.push(response_body);
         $scope.resultMessage = response;
         return false;
     };
     
     /**
      * Assign default values
      * 
      * @param array data
      * @param integer def_amount
      * @returns none/void
      */
     var assignDefaultValues = function(data,def_amount){
         //To avoid looping, we need to know the index for default values
	  $scope.currency_code_input = data[148]; //fixed index for US
	  $scope.currency_code_output = data[112];//fixed index for Philippines	  
          $scope.amount = def_amount; //
     };
     
    
}
 