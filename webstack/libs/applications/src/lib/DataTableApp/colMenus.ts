export const colMenus = [
    {
        colName: "Name",
        type: "Name",
        actions: ["get_lastname", "get_firstname", "sort"],
        index: 1

    },
    {
        colName: "Username",
        type: "Username",
        actions: ["check_database", "get_password", "get_status", "sort"],
        index: 2
    },
    {
        colName: "Email",
        type: "Email",
        actions: ["get_domains", "sort"],
        index: 3
    },
    {
        colName: "Phone Number",
        type: "Phone",
        actions: ["get_area-code", "sort"],
        index: 4
    },
    {
        colName: "Address",
        type:"Address",
        actions:["get_street_num", "get_street_name", "zipcode"],
        index: 5
    }
]