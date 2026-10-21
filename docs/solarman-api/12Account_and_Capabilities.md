
Upon initial account activation, the following features are enabled by default as **open**.

Other features that are **disabled** by default need to be coordinated with the responsible business for separate activation.

| **API Module** | **Interface Code** | **Document Number** | **API Name**      | **Default Permission**                          |
|:-----------:|----------|----------|----------------|---------------------------------------------|
|  **Account Interface**   | A0       |          | Get Token        | open</font>    |
|             | A1       |          | Get Account Merchant Relationship | open</font>    |
|             | A2       |          | Get Internal Permissions | open</font>    |
|             | A3       |          | Register Account           | disable</font> |
|             | A4       |          | Modify Binding Information | disable</font> |
|             | A5       |          | Reset Password           | disable</font> |
|             | A6       |          | Change Password           | disable</font> |
|             | A7       |          | Modify Account Information | disable</font> |
|             | A8       |          | Get Account Information | open</font>    |
|             | A13      | 2.10     | Account Cancellation Verification | disable</font> |
|             | A14      | 2.11     | Account Cancellation           | disable</font> |
|  **Device Interface**   | D1       |          | Get Device List under Merchant | open</font>    |
|             | D2       |          | Get Real-time Device Data       | open</font>    |
|             | D3       |          | Get Historical Device Data       | open</font>    |
|             | D4       |          | Get Device Alarm List       | open</font>    |
|             | D5       |          | Get Device Alarm Details       | open</font>    |
|             | D6       |          | Get Gateway SIM Card Information | open</font>    |
|             | D7       | 4.13     | Add Logger          | disable</font> |
|             | D8       | 4.14     | Delete Logger          | disable</font> |
|             | D9       |          | Device Control           | open</font>    |
|             | D10      |          | Get Device Communication Relationship | open</font>    |
|             | D11      |          | Custom Command          | open</font>    |
|  **Plant Interface**   | S2       |          | Get Plant List under Account | open</font>    |
|             | S1       |          | Query Basic Plant Information | open</font>    |
|             | S4       |          | Get Plant Device List       | open</font>    |
|             | S5       |          | Get Real-time Plant Data       | open</font>    |
|             | S6       |          | Get Historical Plant Data       | open</font>    |
|             | S3       |          | Get Plant Operation Permissions       | open</font>    |
|             | S7       |          | Get Plant Alarm List       | open</font>    |
|             | S8       | 4.8      | Create Plant           | disable</font> |
|             | S10      |          | Delete Plant           | disable</font> |
|             | S9       |          | Modify Plant           | disable</font> |
|             | S11      |          | Set Offset          | disable</font> |
|             | S12      |          | Set Calculation Method for Cumulative Power Generation | disable</font> |
|             | S13      | 4.16     | Plant Alarm List V2.0     | disable</font> |
|             | S14      | 4.15     | Get Details of Meters under Plant | disable</font> |
|             | S15      | 4.17     | Query Real-time Weather of Plant | disable</font> |
|             | W1       |          | Query Real-time Weather         | disable</font> |
|             | W2       |          | Query Future Weather         | disable</font> |
|             | S16      | 4.20     | Batch Get Plant Device List     | disable</font> |
|  **Public Interface**   | C1       |          | Generate Verification Code          | disable</font> |
|             | A12      | 13       | Query Remaining Call Count for APPID | open</font>    |
