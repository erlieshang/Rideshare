# Rideshare
A rideshare application for ECE651 project

User-related API:

All response contain an attribute called "code", which you could get the meaning of each code in error.js

/test is to return what you have passed to it

/register
{
    "firstName": "Bob",
    "lastName": "Zhu",
    "email": "eshang@uwaterloo.ca",
    "number": "2268993866",
    "password": "secret",
    "gender": "male" or "female"
}

/verify
{
  "email": "uwzhuboyuan@gmail.com",
  "code": "111111"
}

/get_token

{
  "email": "uwzhuboyuan@gmail.com",
  "password": "111111"
}

if succeed, response will contain 'token'

***for all the routes below, you should contain "x-access-token": {token} in the header***
/info (this is get method)

you will get
{
    "_id": "59ee4799bd38d40012b17bf9",
    "firstName": "Bob",
    "lastName": "Zhu",
    "email": "uwzhuboyuan@gmail.com",
    "number": "2268993866",
    "password": "$2a$10$FLbs6OquBPDTC6A.sFLcsOOTDEIegZaL3QzIFlo4GTUBHGqKT6vq6",
    "verifyCode": 275919,
    "gender": true,
    "__v": 0,
    "avatar": "59ee818553cca9001284ec17",
    "comments": [],
    "vehiclePlate": "",
    "notifications": [],
    "driversLicense": "",
    "driverPermission": false,
    "verified": true,
    "score": 10,
    "admin": false
}

/upload_avatar
you should use form-data to upload the picture.
The form has a key called "avatar", whose value is an image file.

/get_avatar (get method)
you will get this user's avatar(image)