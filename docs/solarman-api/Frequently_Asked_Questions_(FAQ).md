
**A1: I have a power station on the Xiaomai platform, why can't I find it through OPENAPI?**

Q: If your power station is on the Xiaomai Merchant Edition, please use the Merchant Edition token to obtain the power station data; if your power station is on Xiaomai Smart Electricity, please use the Smart Electricity token to obtain the power station data.

The difference between the Merchant Edition token and the Smart Electricity token is: if the parameter `orgId` (Merchant ID) is included when obtaining the token, it is a Merchant Edition token; if the `orgId` (Merchant ID) is not included, it is a Smart Electricity token.

**A2: How can I get the orgId (Merchant ID)?**

Q: Please contact after-sales directly to obtain it, or query interface 2.2 for it.

**A3: I successfully obtained the token, why can't I use it to retrieve power station or device data?**

Q: When using the token to get data from other interfaces, you need to add "bearer " (note there is a space here) before the token. For example: `bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiIwX3Boc2V6ZUBnbWFpbC5jb21fMiIsInNjb3BlIjpbImFsbCJdLCJkZXRhaWwiOnsib3JnYW5pemF0aW9uSWQiOjAsInRvcEdyb3VwSWQiOm51bGwsImdyb3VwSWQiOm51bGwsInJvbGVJZCI6LTEsInVzZXJJZCI6MTI1NzYwMzksInZlcnNpb24iOjEwMDEsImlkZW50aWZpZXIiOiJwaHNlemVAZ21haWwuY29tIiwiaWRlbnRpdHlUeXBlIjoyLCJtZGMiOiJGT1JFSUdOXzEiLCJhcHBJZCI6IjIwMjMwNTA5ODIwMzE2NTAifSwiZXhwIjoxNjk4MTY2ODIzLCJtZGMiOiJGT1JFSUdOXzEiLCJhdXRob3JpdGllcyI6WyJhbGwiXSwianRpIjoiNjIzYjNjMTctZDQ5My00Mzc4LWE4ZjYtMDg4ZTI0NTVkOWJjIiwiY2xpZW50X2lkIjoidGVzdCJ9.eL6yGqcKiuFa9IxAe674peDWV9D97b5vhvh4aVukTta983KTUtdNjfkqkjsHBMFHy-V9Uv6l4yP2AM-CdOVx-AmDejFWbcG4nzmRE09Mkp5xxDmBxOj7Wlvu7FMezEIJi0i8gr1L6WHEgf0rwWO2mY0hJNLIe5hYsOIaHMjxXiGeQ7zFglgNpgR8-CmD66pqzBN5tbyBqTgH1H-YzZI92fi9wrJMearD9Nbrg-HFCQ08tQqG2tUT_8mPl4ds4BUn8RcUoTLBTHuy28vggOTfZwvWCTnudcBG3JeaEEXQZpaHZi1Y80AqSxxZPK8cNnIrfmhEnvGU8NKBi6L_qRRhRA`.

**A4: Why can't I control devices through OPENAPI?**

Q: Before controlling devices via OPENAPI, please ensure that you have device control permissions on the Xiaomai Merchant Edition or Xiaomai Smart Electricity platform. If you do not have device control permissions, please contact the device manufacturer for authorization.

If you have device control permissions:
- If you are authorized for "custom commands", use interface 3.9 to control the device. The `content` parameter (command details) required in the interface should be provided by the device manufacturer.
- If you are authorized for "single command", it is not supported via API for control at the moment.
- If you are authorized for "batch command", it is not supported via API for control at the moment.

**A5: Why does the interface return "device not found" error?**

Q: The reason is that the device you are querying is not under the account used for the API call. Please log in to the Xiaomai platform (Merchant Edition/Smart Electricity) to confirm whether this device exists under your account and check if the account used for the API call matches the account that sees the device.

**A6: Why does the interface return "invalid param type"?**

Q: There could be multiple reasons. You need to compare each input parameter with the instructions in this document to verify. If you cannot confirm, please provide the details of the interface you are calling, the input parameters, and the error details, and send them to customerservice@solarmanpv.com for troubleshooting. (It is also recommended to provide the APPID and the account you are calling with.)

**A7: Why does the interface return "AUTH_INVALID_USERNAME_OR_PASSWORD"?**

Q: There could be multiple reasons:
- The API domain name used in the interface is incorrect (use [https://api.solarmanpv.com](https://api.solarmanpv.com) for China, and [https://globalapi.solarmanpv.com](https://globalapi.solarmanpv.com) for other countries).
- Incorrect account information (you can only choose one of three account types: email, phone, or username; the parameter name `username` or `email` needs to match the actual input; if it's a phone account, you need to add the `countryCode` parameter).
- Incorrect password (the password should be the one used to log in to the Xiaomai platform, it should be encrypted with SHA256, and in lowercase).
- Incorrect calling format (Param and Body).

If you cannot troubleshoot, please provide the details of the API call (URL, input parameters) and contact after-sales for assistance.

**A8: Why can't I query data from the Xiaomai platform through OPENAPI?**

Q: Except for a very few functions that are not supported by OPENAPI, most of the data on the Xiaomai platform can be queried via OPENAPI, and the data retrieved through OPENAPI is completely consistent with that on the Xiaomai platform.

If you are not sure which interface corresponds to a particular data on the Xiaomai platform, please provide a screenshot of the data from the Xiaomai platform and contact after-sales to provide the interface number.

If you believe that the data on the Xiaomai platform is inconsistent with the data retrieved through OPENAPI, please provide a screenshot of the data on the Xiaomai platform and a screenshot of the detailed API call for that data, and report this to after-sales.
