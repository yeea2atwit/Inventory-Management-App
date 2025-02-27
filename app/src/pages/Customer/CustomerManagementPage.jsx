import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { effectAbortSignal } from "../../tools/axiosTools";
import { SERVER_URL } from "../App";
import "../../sass/CustomerManagement.scss"
import { Button } from "@mui/material";
import { Add, Edit, EditOutlined, Visibility, VisibilityOutlined } from "@mui/icons-material";
import CreateCustomerPage from "./CreateCustomerPage";
import { formatToUSCurrency, getCustomerFullName } from "../../tools/generalTools";
import { FormInput, FormSelectInput } from "../../components/FormComponents";

const CustomerManagementPage = (props) => {

    // When overridden by this page itself
    const { viewingSpecificCustomer, editingSpecificCustomer } = props;

    if (viewingSpecificCustomer) {
        return <ViewCustomerPage customerId={viewingSpecificCustomer} {...props} />
    }

    if (editingSpecificCustomer) {
        return <CreateCustomerPage editingId={editingSpecificCustomer} {...props} />
    }

    return <CustomersView {...props} />
}

const CustomersView = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Loaded upon mount
    const [customers, setCustomers] = useState([]);
    const [loaded, setLoaded] = useState(false);

    // Upon mount we use a GET request to get a list of all item types so we can display them
    useEffect(() => {
        const { controller, isCleanedUp, cleanup } = effectAbortSignal(5);
        (async () => {
            try {
                let response = await axios.get(`${SERVER_URL}/customer/getCustomers`, { signal: controller.signal })
                console.log("CustomersView mount GET /customer/getCustomers", response);
                setCustomers(response.data.customers);
            }
            catch (err) {
                if (axios.isCancel(err)) return `Request canceled due to ${isCleanedUp() ? "timeout" : "unmount"}`
                console.log("Error CustomersView mount GET /customer/getCustomers", err);
            }
            finally {
                setLoaded(true);
            }
        })()
        return cleanup;
    }, []);

    // Filtering controls. currentSearch is what the user modifies, currentSearchInternal eventually gets changed but is throttled
    const [currentSearchInternal, setCurrentSearchInternal] = useState("");
    const [currentSearch, setCurrentSearch] = useState("");
    const [filterBy, setFilterBy] = useState("Customer Name");
    const [filterType, setFilterType] = useState("Any");

    // When currentSearch changes, 0.5 seconds later we will update currentSearchInternal
    const currentSearchUpdateThrottleRef = useRef();
    useEffect(() => {

        if (currentSearchUpdateThrottleRef.current) {
            clearTimeout(currentSearchUpdateThrottleRef.current);
        }

        currentSearchUpdateThrottleRef.current = setTimeout(() => {
            setCurrentSearchInternal(currentSearch);
        }, 500)

    }, [currentSearch])

    // This memo only updates when state variables update, so when it updates it is always accompanied by a re-render
    const filteredCustomers = useMemo(() => {

        if (!currentSearchInternal) {
            return [...customers];
        }

        return customers.filter(customer => {

            let applyingFilterTo;
            switch (filterBy) {
                case "Customer Name":
                default:
                    applyingFilterTo = getCustomerFullName(customer);
                    break;
            }

            const keywords = currentSearchInternal.split(" ").map(word => word.toLowerCase());
            switch (filterType) {
                case "Exact":
                    return applyingFilterTo === currentSearchInternal;
                case "All":
                    for (let word of keywords)
                        if (!applyingFilterTo.includes(word))
                            return false;
                    return true;
                case "Any":
                default:
                    for (let word of keywords)
                        if (applyingFilterTo.includes(word))
                            return true;
                    return false;
            }
        })

    }, [filterBy, filterType, currentSearchInternal, customers])

    let createJsx = (
        <div className="management-create-button-container">
            <Button
                fullWidth
                size="large"
                color="success"
                variant="contained"
                onClick={() => {
                    trySelectNode("createNewCustomer")
                }}>
                <span>Create New Customer</span>
            </Button>
        </div>
    )

    let noneJsx;
    if (customers.length === 0) {
        noneJsx = <h3 className="text-center pt-3"><em>No Customers Yet</em></h3>
    }
    else if (filteredCustomers.length === 0) {
        noneJsx = <h3 className="text-center pt-3"><em>No Results Found</em></h3>
    }

    noneJsx = loaded && noneJsx; // Don't display noneJsx unless our initial GET request is done. This is so it doesn't show 'None Yet' heading when in reality we don't know yet

    return (
        <div className="customer-management-sub-page">
            <h2 className="sub-page-heading">Customer Management</h2>
            <CustomerFilter
                currentSearch={currentSearch} setCurrentSearch={setCurrentSearch}
                filterBy={filterBy} setFilterBy={setFilterBy}
                filterType={filterType} setFilterType={setFilterType}>
            </CustomerFilter>
            {createJsx}
            {noneJsx}
            <div className="customers-display-container">
                {filteredCustomers.map((customer) => <SimpleCustomerDisplay
                    key={customer.customerId}
                    customer={customer}
                    trySelectNode={trySelectNode}
                />)}
            </div>
        </div>
    )
}

export const CustomerFilter = (props) => {

    const { currentSearch, setCurrentSearch, filterBy, setFilterBy, filterType, setFilterType } = props;

    return (
        <div className="management-filtering-container">
            <div className="search-bar">
                <FormInput
                    minHelperText
                    fullWidth
                    label="Filter Query"
                    value={currentSearch}
                    setState={setCurrentSearch}>
                </FormInput>
            </div>
            <div className="filter-by">
                <FormSelectInput
                    minHelperText
                    fullWidth
                    value={filterBy}
                    setState={setFilterBy}
                    values={["Customer Name"]}
                    label="Filter By">
                </FormSelectInput>
            </div>
            <div className="filter-type">
                <FormSelectInput
                    minHelperText
                    fullWidth
                    value={filterType}
                    displayToValueMap={{ "Includes Any": "Any", "Includes All": "All", "Exact Match": "Exact" }}
                    setState={setFilterType}
                    label="Filter Type">
                </FormSelectInput>
            </div>
        </div>
    )
}

const ViewCustomerPage = (props) => {

    // Inherited props
    const { selectNodeNextRefresh, refreshNavInfo, trySelectNode, lockExitWith, unlockExit, addDashboardMessage } = props;

    // Specific props
    const { customerId } = props;

    return <div>What a view</div>

}

export const SimpleCustomerDisplay = (props) => {

    const {
        customer,
        customer: {
            customerId,
            customerFirstName,
            customerMiddleName,
            customerLastName,
            addresses,
            contacts,
            dateAdded,
        },
        trySelectNode,
    } = props;

    const customerFullName = getCustomerFullName(customer);
    const numAddresses = addresses.length;
    const numContacts = contacts.length;

    const are = (numContacts !== 1) ? "are" : "is";
    const methods = (numContacts !== 1) ? "methods" : "method"
    const addressText = (numAddresses !== 1) ? "addresses" : "address"

    return (
        <div className="customer-display-container">
            <div className="name-date-group">
                <span className="customer-name">
                    {customerFullName}
                </span>
                <span className="date-added">
                    {dateAdded}
                </span>
            </div>
            <p className="address-count">
                This customer has {numAddresses} {addressText} on record
            </p>
            <p className="contact-count">
                There {are} {numContacts} {methods} of contact on record for this customer
            </p>
            <div className="button-group Mui-ButtonCompression">
                <Button
                    size="small"
                    color="secondary"
                    variant="outlined"
                    onClick={() => {
                        trySelectNode("manageCustomers", {
                            overrideProps: {
                                viewingSpecificCustomer: customerId,
                            }
                        })
                    }}
                    endIcon={<VisibilityOutlined />}>
                    <span>View</span>
                </Button>
                <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => {
                        trySelectNode("manageCustomers", {
                            overrideProps: {
                                editingSpecificCustomer: customerId,
                            }
                        })
                    }}
                    endIcon={<EditOutlined />}>
                    <span>Edit</span>
                </Button>
            </div>
        </div>
    )
}

export default CustomerManagementPage;