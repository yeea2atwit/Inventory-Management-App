import '../sass/TreeView.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import { newAbortSignal } from '../tools/axiosTools'
import axios from 'axios'
import { SERVER_URL } from '../pages/App'

/**
 * My function description.
 * @returns {[Object, () => void]} An array containing an object as the first element and a function as the second element.
 */
const useGETNavInfo = () => {

    const [navInfo, setNavInfo] = useState({})

    const refreshNavInfoController = useRef(null);

    // This effect does nothing except return a cleanup (on unmount essentially) function that will abort the current controller
    useEffect(() => {
        return () => {
            refreshNavInfoController.current?.abort();
        }
    }, [])

    const refreshNavInfo = useCallback(async (additionalInfo) => {

        refreshNavInfoController.current?.abort();

        const controller = newAbortSignal(10);
        refreshNavInfoController.current = controller;

        try {
            let { data } = await axios.get(`${SERVER_URL}/dashboard/navInfo`, { signal: controller.signal })            

            // For now we do this
            data = {

                customers: 8,

                invoices: 4,
                inProgressInvoices: [
                    {
                        invoiceId: 1,
                        customerName: "Joe",
                    },
                    {
                        invoiceId: 2,
                        customerName: "Joe",
                    },
                ],

                itemTypes: 22,
                itemInstances: 21,

                stockChanges: 5,
                inProgressStockChanges: [
                    {
                        stockChangeId: 1,
                        date: "11 Jun 2023",
                    },
                    {
                        stockChangeId: 2,
                        date: "11 Jun 2023",
                    },
                ],
            }

            // Jerry rig
            let custResponse = await axios.get(`${SERVER_URL}/customer/getCustomers`, { signal: controller.signal })
            data.customers = custResponse.data.customers.length;

            let itemTypesResponse = await axios.get(`${SERVER_URL}/itemType/getItemTypes`, { signal: controller.signal })
            data.itemTypes = itemTypesResponse.data.itemTypes.length;

            console.log("refreshNavInfo: Calling setNavInfo which will re-render dashboard")
            setNavInfo(data);
        }
        catch (err) {
            if (axios.isCancel(err)) return console.log("Request canceled due to timeout or unmount", err);
            console.log("Error at GET /dashboard/navInfo", err);
        }
    }, [])

    return ([navInfo, refreshNavInfo]);
}

export default useGETNavInfo;

