@echo off
curl -X POST "https://lunasdigital.atenderbem.com/int/getAllOpenChats" -H "accept: application/json" -H "Content-Type: application/json" -d "{\"queueId\": 25, \"apiKey\": \"cd4d0509169d4e2ea9177ac66c1c9376\"}"

