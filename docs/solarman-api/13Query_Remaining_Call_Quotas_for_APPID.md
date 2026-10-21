When calling this interface, one call will be deducted from the remaining number of calls for the APPID, so please do not call frequently.

If the remaining available calls are low, please contact the contact person who connected when the APPID was activated as soon as possible.

| Query Balance | | | | |
| --- | --- | --- | --- | --- |
| **Interface Description** | Query remaining number of calls for the APPID | | | |
| **Request URL** | https://api.solarmanpv.com/account/v1.0/balance | | | |
| **Request Method** | post | | | |
| **Request Type** | application/json | | | |
| **Response Type** | */* | | | |
| **Request Parameters** | | | | |
| **Parameter Name** | **Data Type** | **Parameter Type** | **Is Required** | **Description** |
| language | string | query | N | Language type, example value: zh |
| authorization | string | header | Y | accessToken, example value: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9 |
| appId | string | body | Y | appId, example value: 2019444421112 |
| **Response Parameters** | | | | |
| **Parameter Name** | **Data Type** | **Parameter Type** | **Is Required** | **Description** |
| code | string | body | N | Information code, example value: 10000 |
| total | integer | body | N | Remaining number of calls |
| msg | string | body | N | Information description, example value: success |
| success | boolean | body | N | Whether successful, example value: true |
| requestId | string | body | N | Request ID, example value: 1d6f6eca9bee4b6483d4af064b659eec |
| Example | | | | |
| Request Parameters | {<br/>"appId": "201911629231234"<br/>} | | | |
| Response Value | {<br/>"code": null,<br/>"msg": null,<br/>"success": true,<br/>"requestId": "25cd1610de1da0ad",<br/>"total": 2543487<br/>} | | | |
