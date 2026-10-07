# Krishna Decor shared contract

This folder documents the boundary between the independently deployed owner and staff apps.

The API now enforces the contract in `project.schema.json`. The manager app owns project, customer, quotation, invoice and payment records. The staff app receives only assigned projects and may submit measurement/product drafts for manager approval.
