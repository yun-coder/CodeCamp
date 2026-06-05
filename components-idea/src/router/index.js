/**
 @description
 @author yunLiang
 @date 2025/12/18 18:21
  版权：Copyright (c) Zhongzao Software Co. LTD 2022-2062 All rights reserved
 **/

import {createRouter, createWebHistory} from 'vue-router'
import Home from '../views/Home.vue'
import SvgIconTest from '../views/svgIcon-test.vue'
import openDialog from '../views/openDialog.vue'
import tableSearch from "../views/tableSearch.vue";

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    {
        path: '/svg-icon',
        name: 'SvgIcon',
        component: SvgIconTest
    },
    {
        path: '/openDialog',
        name: 'openDialog',
        component: openDialog
    },
    {
        path: '/tableSearch',
        name: 'tableSearch',
        component: tableSearch
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
