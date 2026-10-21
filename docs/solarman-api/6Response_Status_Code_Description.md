
| Code | Description |
| --- | --- |
| 1000000 | success |
| 3201001 | Service Currently Unavailable |
| 2101002 | Client executed too frequently |
| 2101003 | Client is forbidden |
| 3501004 | Remote RPC exception |
| 2101005 | Parameter does not exist |
| 2101006 | Invalid parameter |
| 2101007 | List too long |
| 2101008 | Invalid parameter type |
| 2101009 | AppId or API is locked |
| 2101010 | AppId insufficient allowance |
| 2101011 | Number of users up to five |
| 2101012 | Should be within 30 days |
| 2101013 | Should be within 12 months |
| 2101014 | Start time should be earlier than end time |
| 2101015 | Time format error |
| 2101016 | Device has no upload records found |
| 2101017 | Auth token not found |
| 2101018 | Auth appId not found |
| 2101019 | Auth invalid token |
| 2101020 | Auth invalid orgId |
| 2101021 | Auth invalid appId |
| 2101022 | Business error |
| 2101023 | Access denied |
| 2101024 | Resource not found |
| 2101025 | Auth failed |
| 2101026 | Page too big |
| 2101027 | Auth has no outbound operation permission |
| 2101028 | Auth invalid user |
| 2101029 | No outbound roleId |
| 2101030 | No outbound external station delete permission |
| 2101031 | Plant not found |
| 2101032 | Device not found |
| 2101033 | Email already registered |
| 2101034 | Phone number already registered |
| 2101035 | Email not registered |
| 2101036 | Phone number not registered |
| 2101037 | Username already registered |
| 2101038 | Reset password not allowed |
| 2101039 | This date can only be before the current date |
| 2102001 | Captcha request too frequently |
| 2102002 | Captcha was wrong |
| 2102003 | Captcha has expired |
| 2102004 | Email already registered |
| 2102005 | Phone number already registered |
| 2102006 | Username already registered |
| 2102007 | Old user id already registered |
| 2102008 | Old password wrong |
| 2102009 | Username format error |
| 2102010 | Email format error |
| 2102011 | Phone number format error |
| 2104001 | Gateway exists |
| 2104002 | Auto discovery gateway exists |
| 2104003 | Gateway cannot be auto-discovered |

## Error Code Reasons and Solutions
| Error Code | Error Message | Reason | Solution |
|:--------| :--- |:-------------------------------------------| :--- |
|2101019|auth invalid token|solarman accout or password not correct,or appId or appSecret is not correct|1)check if solarman account can log in solarman<br/> 2)check if appId and appSecret is correct|
| 2101010 | "msg":"appId insufficient allowance" | Current call count has ran out | Please contact sales or customerservice@solarmanpv.com to charge |
|2101006|invalid param|invalid param|Check whether the input parameters comply with the documentation requirements, including case sensitivity, mandatory fields, and parameter order |
| 2101017 | Auth token not found | Parameter setting error | Header parameter Authorization is required; the value needs to be prefixed with "bearer " |
| 2101025 | AUTH_INVALID_USERNAME_OR_PASSWORD | Account correspondence error | 1)Check if mobile, email, and username in the input parameters have corresponding errors <br/> 2) Password needs to be SHA256 encrypted, in lowercase format |
|2101022|business error|请求越权|Verify that the requested data belongs to the account used for the current API call: not only must the account match, but the service endpoint (Business or Smart) must also be consistent|
| 2101023 | Access denied | Current user does not have the corresponding data permission | 1) Check if the token corresponds <br/> 2) Check if the current user has relevant execution permissions |
| 2101009 | AppId or API is locked | The default access granted for OpenAPI is for querying data-related interfaces; permission for modifying data interfaces needs to be granted separately | Contact customer service to explain the reason, then evaluate whether to grant permissions |
|3501004|remote rpc exception|remote rpc exception|Platform service is under maintenance. Please retry later. If the error persists after retries, contact customer support.|
|         | Querying the station list returns empty, "stationList":null | Token parameter used incorrectly | Refer to API 1.5.2 Process data from SOLARMAN Business via OpenAPI for specific operational steps |
|         | Querying real-time data for devices returns empty dataList:[] | deviceId or deviceSN passed incorrectly | The deviceId and deviceSN in the input parameters must be for the queried devices and cannot use the logger's deviceId or deviceSN |
