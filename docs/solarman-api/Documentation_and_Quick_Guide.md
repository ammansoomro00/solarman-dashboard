# 1 Open Platform Description
1. **SolarMAN OpenAPI Open Platform** provides standardized RESTful data access services for certified users.
2. The platform interface is based on the HTTP/HTTPS protocol and uses OAuth2.0 authentication mechanism.
3. Use GET/POST, refer to the interface definition for details. Parameters are UTF-8 encoded and processed with URL encoding.
4. All data is UTF-8 encoded.
5. Supports JSON format for returned data.
6. Return data structure: main content, code: error code, msg: error message.
7. Except for obtaining and extending the ACCESS_TOKEN interface, other interface calls need to add Authorization in the HTTP header, with the value being the ACCESS_TOKEN.

##  Platform Terminology
| Application | Basic element of the Open Platform. Users can call the platform API only after creating an application. |
| --- | --- |
| APP_ID | The unique identifier ID of the application. |
| APP_SECRET | The authentication key of the application, which must be kept safe and not disclosed. |
| ACCESS_TOKEN | The authorization token after successful authentication, used to request server data. |
| REFRESH_TOKEN | A refresh token, used to extend the validity period of the ACCESS_TOKEN. |

##  Access Process
1. **Register as a user of the SOLARMAN Smart Electric or SOLARMAN Merchant version.**

> When applying for API login elements, please provide:
>
> - **[User Contact Information]**: Mainly email, as well as other content that can help verify identity (e.g., SOLARMAN account).
> - **[Customer Type]**: Individual, equipment manufacturer, installation and maintenance provider, distributor, investor.
> - **[Purpose Description]**: Clearly describe the use case.
>
> Send this information via email to your business contact or to the after-sales service email: **service@solarmanpv.com**

2. **Register as a SOLARMAN developer (contact business), create an application (APP), generate APP_ID and APP_SECRET, and submit for business review.**
3. **Developers develop and test according to the development documentation.**
4. **Connect to the official environment interface.**

##  Call Limitations
+ **Default call limitations for all regular interfaces.**

- The maximum number of requests per 10 seconds for a single OpenApi account is 300.

+ **Call limitations for device control interfaces (interface 3.7).**

- The maximum number of requests per minute for a single OpenApi account is 50.

##  Request Address
Due to the data center upgrade of the SOLARMAN platform, starting from April 17, 2023, please choose a different request address depending on the data center you are accessing:

| **Data Center** | **Request Address** |
| :---: | :---: |
| China Data Center | [https://api.solarmanpv.com](https://api.solarmanpv.com) |
| International Data Center | [https://globalapi.solarmanpv.com](https://api.solarmanpv.com) |

##  Quick Guide
###  Handling Data from the "SOLARMAN Smart Electric" Platform via OpenAPI
#####  Retrieve Plant and Device Data
![](images/1625576835036-3c181f6a-6f7b-4359-bd2f-c13923d9d9ca.png)

**Prerequisites (any one of the following must be met)**

1. The account has created a station and added a data logger via the SOLARMAN Smart Electric Web/App or OpenAPI, and data can be viewed normally.

2. The account has received an authorized station from a merchant via the SOLARMAN Smart Electric Web/App, and data can be viewed normally.

**Call Guide**

The call guide only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Smart Power" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.

**<font style="background-color:yellow;">Step 2: Obtain the List of Power Plants Under the Account</font>**

Through this interface, you can obtain the list of power stations under the current account and learn the Plant ID of each power station.

（1）Interface Code: **4.4**

（2）Notes:

+  The `authorization` field in the header is mandatory, and the value must be prefixed with `token_type` "bearer " (note there is a space after "bearer").
   - Example:
      * TOKEN value obtained: FFFFFFFFF
      * The final value of the `authorization` field in the header:


```bash
'Authorization: bearer FFFFFFFFF'
```

+  If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 3: Obtain Real-Time Data of the Power Plant</font>**

After obtaining the Plant ID, you can use this interface to query the real-time data of the power station, such as power generation and grid connection power.

（1）Interface Code: **4.5**

（2）Notes:

+ `stationId` is mandatory and must match the user's associated power station ID.

**<font style="background-color:yellow;">Step 4: Obtain the List of Devices Under the Power Plant</font>**

After obtaining the Plant ID, you can use this interface to query the list of devices under the power station and learn the SN and Device ID of each device.

（1）Interface Code: **4.2**

（2）Notes:

+ If the `deviceType` field is not passed, it will query all device types by default. If passed, it will query the specified device type.
+ Refer to the API documentation for device types: **7. Enumeration Type Description**
+ If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 5: Obtain Real-Time Data of Devices</font>**

After obtaining the SN and Device ID of the device, you can use this interface to query the real-time data of the device, such as the total AC output power of the inverter, power generation of components, and battery charging power.

（1）Interface Code: **3.3**

（2）Notes:

+ The `deviceSn` field is mandatory.

#####  Create a Power Plant
![](images/1625576835433-5746646b-bab4-4fe3-b59d-463c48b73e49.png)

**Prerequisites**

An account has already been created through Xiaomai Smart Power Web/App or OpenAPI.

**Call Guide**

The call example only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Smart Power" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.

**<font style="background-color:yellow;">Step 2: Create a Power Plant</font>**

Through this interface, you can create a power station under the account.

（1）Interface Code: **4.8**

（2）Notes:

+ All mandatory fields must be provided with values.
+ For `gridInterconnectionType` and `type`, refer to the API documentation **6. Enumeration Type Description**.
+ For the `currency` field, refer to the API documentation **9. Dictionary Information - Currency**.
##### 1.5.1.3 Add Device
![](images/1625576835692-6b1a73b0-4e8d-4981-81a5-601350039c63.png)

**Prerequisites (satisfy any one of the following conditions)**

(1) The account has already created a power station through Xiaomai Smart Power Web/App or OpenAPI;

(2) The account has received authorization for a power station from the merchant on Xiaomai Smart Power Web/App and has the permission to add devices.

**Call Guide**

The call example only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Smart Power" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.

**<font style="background-color:yellow;">Step 2: Obtain the List of Power Plants Under the Account</font>**

Through this interface, you can obtain the list of power stations under the current account and learn the Plant ID of each power station.

（1）Interface Code: **4.4**

（2）Notes:

+ The `authorization` field in the header is mandatory, and the value must be prefixed with `token_type` "bearer " (note there is a space after "bearer").
   - Example:
      * TOKEN value obtained: FFFFFFFFF
      * The final value of the `authorization` field in the header:

```bash
'Authorization: bearer FFFFFFFFF'
```

+ If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 3: Add Device to the Power Plant</font>**

Through this interface, combined with the Plant ID obtained above, you can add the specified device to the power station.

（1）Interface Code: **4.13**

（2）Notes:

+ The `isAuto` field is mandatory. When `isAuto = true`, it indicates that the sub-devices under this gateway will automatically establish an association with the power station when uploading data. When `isAuto = false`, it indicates that only the gateway-to-station relationship is established, and sub-devices must be manually added. The sub-device addition interface is currently not supported. If needed, please contact sales.

###  Handle Data on the "Xiaomai Merchant Edition" Platform via OpenAPI
#####  Obtain Power Plant and Device Data in the Maintenance Version
![](images/1625576836110-a0528b10-1366-4346-8e3a-d0d6ed65d288.png)

**Prerequisites (satisfy any one of the following conditions)**

(1) The account has created a power station and added a data logger through Xiaomai Merchant Edition Web/App or OpenAPI, and can normally view the station and device data;

(2) The account has received authorization for a power station from a merchant or user on Xiaomai Merchant Edition Web/App and can normally view the station and device data.

**Call Guide**

The call guide only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token for the First Time</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Merchant Edition" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.

**<font style="background-color:yellow;">Step 2: Obtain the Merchant Relationship of the Account</font>**

With a valid token, you need to use this interface to obtain the merchant relationship of the current account in the Merchant Edition. You need to record the merchant's OrgID.

（1）Interface Code: **2.2**

（2）Notes:

+ The `companyId` in the response represents the `orgId`.
+ An account can belong to multiple companies, so choose the required `orgId` according to your needs.


**<font style="background-color:yellow;">Step 3: Obtain Token for the Second Time</font>**

When obtaining the token for the second time, submit the OrgID obtained earlier to the interface. You will then receive a new token containing this merchant's information. When using this token to call other OpenAPI interfaces, the data returned will belong to this account under the merchant.

（1）Interface Code: **2.1**

（2）Notes:

+ The `orgId` field is mandatory when obtaining the merchant token; otherwise, a user token will be returned.

**<font style="background-color:yellow;">Step 4: Obtain the List of Power Plants Under the Account</font>**

Through this interface, you can obtain the list of power stations under the current account and learn the Plant ID of each power station.

（1）Interface Code: **4.4**

（2）Notes:

+ The `authorization` field in the header is mandatory, and the value must be prefixed with `token_type` "bearer " (note there is a space after "bearer").
   - Example:
      * TOKEN value obtained: FFFFFFFFF
      * The final value of the `authorization` field in the header:

```bash
'Authorization: bearer FFFFFFFFF'
```

+ If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 5: Obtain Real-Time Data of the Power Plant</font>**

After obtaining the Plant ID, you can use this interface to query the real-time data of the power station, such as power generation and grid connection power.

（1）Interface Code: **4.5**

（2）Notes:

+ The `stationId` field is mandatory and must match the user's associated power station ID.

**<font style="background-color:yellow;">Step 6: Obtain the List of Devices Under the Power Plant</font>**

After obtaining the Plant ID, you can use this interface to query the list of devices under the power station and learn the SN and Device ID of each device.

（1）Interface Code: **4.2**

（2）Notes:

+ If the `deviceType` field is not passed, it will query all device types by default. If passed, it will query the specified device type.
+ Refer to the API documentation for device types: **6. Enumeration Type Description**.
+ If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 7: Obtain Real-Time Data of Devices</font>**

After obtaining the SN and Device ID of the device, you can use this interface to query the real-time data of the device, such as the total AC output power of the inverter, power generation of components, and battery charging power.

（1）Interface Code: **3.3**

（2）Notes:

+ The `deviceSn` field is mandatory.

#####  Obtain Device Data in the Device Library Section
![](images/1625576836540-f046c3a8-9d08-42e8-aef9-3e2b6a797571.png)

**Prerequisites**

The account has already imported data loggers into the device library on Xiaomai Merchant Edition Web, and can normally view device data.

**Call Guide**

The call guide only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token for the First Time</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Merchant Edition" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.


**<font style="background-color:yellow;">Step 2: Obtain the Merchant Relationship of the Account</font>**

With a valid token, you need to use this interface to obtain the merchant relationship of the current account in the Merchant Edition. You need to record the merchant's OrgID.

（1）Interface Code: **2.2**

（2）Notes:

+ The `companyId` in the response represents the `orgId`.
+ An account can belong to multiple companies, so choose the required `orgId` according to your needs.

**<font style="background-color:yellow;">Step 3: Obtain Token for the Second Time</font>**

When obtaining the token for the second time, submit the OrgID obtained earlier to the interface. You will then receive a new token containing this merchant's information. When using this token to call other OpenAPI interfaces, the data returned will belong to this account under the merchant.

（1）Interface Code: **2.1**

（2）Notes:

+ The `orgId` field is mandatory when obtaining the merchant token; otherwise, a user token will be returned.

**<font style="background-color:yellow;">Step 4: Obtain the List of Devices Under the Account</font>**

Through this interface, you can obtain the list of devices imported into the device library on the Merchant Edition, and learn the SN and Device ID of each device.

（1）Interface Code: **3.5**

（2）Notes:

+ The `authorization` field in the header is mandatory, and the value must be prefixed with `token_type` "bearer " (note there is a space after "bearer").
   - Example:
      * TOKEN value obtained: FFFFFFFFF
      * The final value of the `authorization` field in the header:

```bash
'Authorization: bearer FFFFFFFFF'
```

+ If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 5: Obtain Real-Time Data of Devices</font>**

After obtaining the SN and Device ID of the device, you can use this interface to query the real-time data of the device, such as the total AC output power of the inverter, power generation of components, and battery charging power.

（1）Interface Code: **3.3**

（2）Notes:

+ The `deviceSn` field is mandatory.

#####  Create a Power Plant
![](images/1625576837033-f14ccc6f-013b-4a3f-8c62-393011788861.png)

**Prerequisites**

The account has been created through Xiaomai Merchant Edition Web/App or OpenAPI, and has the permissions to create power stations.

**Call Guide**

The call guide only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token for the First Time</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Merchant Edition" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.

**<font style="background-color:yellow;">Step 2: Obtain the Merchant Relationship of the Account</font>**

With a valid token, you need to use this interface to obtain the merchant relationship of the current account in the Merchant Edition. You need to record the merchant's OrgID.

（1）Interface Code: **2.2**

（2）Notes:

+ The `companyId` in the response represents the `orgId`.
+ An account can belong to multiple companies, so choose the required `orgId` according to your needs.

**<font style="background-color:yellow;">Step 3: Obtain Token for the Second Time</font>**

When obtaining the token for the second time, submit the OrgID obtained earlier to the interface. You will then receive a new token containing this merchant's information. When using this token to call other OpenAPI interfaces, the data returned will belong to this account under the merchant.

（1）Interface Code: **2.1**

（2）Notes:

+ The `orgId` field is mandatory when obtaining the merchant token; otherwise, a user token will be returned.

**<font style="background-color:yellow;">Step 4: Create a Power Plant</font>**

Through this interface, you can create a power station under the account.

（1）Interface Code: **4.8**

（2）Notes:

+ All mandatory fields must be filled.
+ For `gridInterconnectionType` and `type`, refer to the API documentation **6. Enumeration Type Description**.
+ For the `currency` field, refer to the API documentation **8. Dictionary Information - Currency**.

#####  Add Devices
![](images/1625576837446-924f81dd-ebdc-4010-a359-c31903ca9f20.png)

**Prerequisites (satisfy any one of the following conditions)**

(1) The account has created a power station through Xiaomai Merchant Edition Web/App or OpenAPI, and has the permissions to add devices;

(2) The account has received authorization for a power station from a merchant or user on Xiaomai Merchant Edition Web/App, and has the permissions to add devices.

**Call Guide**

The call guide only demonstrates the marked scenarios in the flowchart. For details on how to use other interfaces, please refer to the specific documentation below.

**<font style="background-color:yellow;">Step 1: Obtain Token for the First Time</font>**

Before using the OpenAPI, you need to exchange your developer information and your account on the "Xiaomai Merchant Edition" platform for an OpenAPI token. This token will be the only credential and requirement for calling all other interfaces within the OpenAPI.

（1）Interface Code: **2.1**

（2）Notes:

+ The APPID parameter is a query parameter that needs to be placed in the URL.
+ The password field needs to be encrypted using SHA256 before passing it as a parameter.
+ Multiple calls to obtain the token will not invalidate the existing token. The token is valid for two months and expires afterward. Resetting the password or modifying user roles will also invalidate the existing token.
+ The APPID of the test environment cannot call the production environment API.
+ You must obtain the token through the account on the "Xiaomai Smart Power" platform. Enter one of the following based on the account’s actual binding: mobile, email, or username, along with the password.

**<font style="background-color:yellow;">Step 2: Obtain the Merchant Relationship of the Account</font>**

With a valid token, you need to use this interface to obtain the merchant relationship of the current account in the Merchant Edition. You need to record the merchant's OrgID.

（1）Interface Code: **2.2**

（2）Notes:

+ The `companyId` in the response represents the `orgId`.
+ An account can belong to multiple companies, so choose the required `orgId` according to your needs.

**<font style="background-color:yellow;">Step 3: Obtain Token for the Second Time</font>**

When obtaining the token for the second time, submit the OrgID obtained earlier to the interface. You will then receive a new token containing this merchant's information. When using this token to call other OpenAPI interfaces, the data returned will belong to this account under the merchant.

（1）Interface Code: **2.1**

（2）Notes:

+ The `orgId` field is mandatory when obtaining the merchant token; otherwise, a user token will be returned.

**<font style="background-color:yellow;">Step 4: Obtain the List of Power Plants Under the Account</font>**

Through this interface, you can obtain the list of power stations under the current account and learn the Plant ID of each power station.

（1）Interface Code: **4.4**

（2）Notes:

+ The `authorization` field in the header is mandatory, and the value must be prefixed with `token_type` "bearer " (note there is a space after "bearer").
   - Example:
      * TOKEN value obtained: FFFFFFFFF
      * The final value of the `authorization` field in the header:

```bash
'Authorization: bearer FFFFFFFFF'
```

+ If pagination parameters are not passed, it will query the first page by default.

**<font style="background-color:yellow;">Step 5: Add Device to the Power Plant</font>**

Through this interface, combined with the Plant ID obtained above, you can add the specified device to the power station.

（1）Interface Code: **4.13**

（2）Notes:

+ The `isAuto` field is mandatory. When `isAuto = true`, it indicates that the sub-devices under this gateway will automatically establish an association with the power station when uploading data. When `isAuto = false`, it indicates that only the gateway-to-station relationship is established, and sub-devices must be manually added. The sub-device addition interface is currently not supported. If needed, please contact sales.

##  Suggestions
| Capability | Recommended Call Frequency | Recommended Storage |
| --- | --- | --- |
| | | |
| | | |
| | | |

